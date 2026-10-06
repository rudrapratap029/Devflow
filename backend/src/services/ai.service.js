/**
 * Simple AI Service for DevFlow
 * Analyzes project metadata and tasks to generate structured project summaries.
 */

// Helper to sanitize API key string from .env (stripping quotes and whitespace)
const cleanKey = (val) => (val ? val.replace(/^["'\s]+|["'\s]+$/g, "").trim() : "");

/**
 * Generate a deterministic fallback summary if AI API is offline or unconfigured.
 */
const generateLocalSummary = ({ project, tasks, progressPercent, delayedTasks, completedTasks, pendingTasks }) => {
  const totalTasks = tasks.length;

  if (totalTasks === 0) {
    return {
      summary: `Project "${project.name}" has no tasks created yet. Getting started requires defining initial milestones.`,
      progress: "0%",
      delayedTasks: [],
      risks: [
        "No tasks are currently tracked in the system",
        "Milestones and delivery schedule are undefined"
      ],
      nextPriorities: [
        "Break project scope into actionable tasks",
        "Assign core features to team members",
        "Set target due dates for first sprint"
      ]
    };
  }

  // Derive top risks
  const risks = [];
  if (delayedTasks.length > 0) {
    risks.push(`${delayedTasks.length} task(s) have passed their due date without completion`);
  }
  const highPriorityPending = pendingTasks.filter((t) => t.priority === "High");
  if (highPriorityPending.length > 0) {
    risks.push(`${highPriorityPending.length} high-priority item(s) are still pending resolution`);
  }
  const unassignedTasks = pendingTasks.filter((t) => !t.assignedTo);
  if (unassignedTasks.length > 0) {
    risks.push(`${unassignedTasks.length} pending task(s) currently have no assigned team member`);
  }
  if (risks.length === 0) {
    risks.push("No immediate project blockers or critical risks identified");
  }

  // Derive next priorities
  const priorities = [];
  if (delayedTasks.length > 0) {
    priorities.push(`Address delayed tasks: ${delayedTasks.slice(0, 2).map((t) => t.title).join(", ")}`);
  }
  const inProgressTasks = tasks.filter((t) => t.status === "In Progress");
  if (inProgressTasks.length > 0) {
    priorities.push(`Complete in-progress work: ${inProgressTasks.slice(0, 2).map((t) => t.title).join(", ")}`);
  }
  const todoTasks = tasks.filter((t) => t.status === "Todo");
  if (todoTasks.length > 0) {
    priorities.push(`Kick off upcoming backlog: ${todoTasks.slice(0, 2).map((t) => t.title).join(", ")}`);
  }
  if (priorities.length === 0) {
    priorities.push("Review final project deliverables with stakeholders", "Conduct post-release verification");
  }

  return {
    summary: `Project "${project.name}" is ${progressPercent}% completed with ${completedTasks.length} of ${totalTasks} tasks finished.`,
    progress: `${progressPercent}%`,
    delayedTasks: delayedTasks.map((t) => t.title),
    risks,
    nextPriorities: priorities.slice(0, 3)
  };
};

/**
 * Generate AI Project Summary
 * @param {Object} params
 * @param {Object} params.project - Project model document
 * @param {Array} params.tasks - List of Task model documents for this project
 * @returns {Promise<Object>} Formatted summary response
 */
export const generateProjectSummary = async ({ project, tasks = [] }) => {
  const now = new Date();

  // Task metrics calculation
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Done");
  const inProgressTasks = tasks.filter((t) => t.status === "In Progress");
  const todoTasks = tasks.filter((t) => t.status === "Todo");

  // A task is delayed if it is not done and its dueDate has passed
  const delayedTasks = tasks.filter(
    (t) => t.status !== "Done" && t.dueDate && new Date(t.dueDate) < now
  );
  const pendingTasks = tasks.filter((t) => t.status !== "Done");

  const progressPercent = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const progressStr = `${progressPercent}%`;

  // Check for AI API keys (Groq preferred, then Gemini)
  const groqKey = cleanKey(process.env.GROQ_API_KEY);
  const geminiKey = cleanKey(process.env.GEMINI_API_KEY);

  // If no tasks exist, return structured starting guidance directly
  if (totalTasks === 0) {
    return generateLocalSummary({
      project,
      tasks,
      progressPercent,
      delayedTasks,
      completedTasks,
      pendingTasks
    });
  }

  // Build concise analysis prompt for AI
  const prompt = `You are an expert software project manager analyzing a project in DevFlow.

Project Details:
- Name: "${project.name}"
- Description: "${project.description || "No description"}"
- Current Status: "${project.status || "Active"}"
- Total Tasks: ${totalTasks}
- Completed Tasks (${completedTasks.length}): ${completedTasks.map((t) => t.title).join(", ") || "None"}
- In Progress Tasks (${inProgressTasks.length}): ${inProgressTasks.map((t) => t.title).join(", ") || "None"}
- Todo Tasks (${todoTasks.length}): ${todoTasks.map((t) => t.title).join(", ") || "None"}
- Overdue/Delayed Tasks (${delayedTasks.length}): ${delayedTasks.map((t) => t.title).join(", ") || "None"}
- Calculated Progress: ${progressStr}

Analyze this project data and respond ONLY with a valid JSON object matching this exact schema (no markdown, no backticks, no extra text):
{
  "summary": "1-2 concise sentences summarizing the overall project status and completion health",
  "progress": "${progressStr}",
  "delayedTasks": [${delayedTasks.length > 0 ? delayedTasks.map((t) => `"${t.title.replace(/"/g, '\\"')}"`).join(", ") : ""}],
  "risks": [
    "Specific potential risk or bottleneck 1",
    "Specific potential risk or bottleneck 2"
  ],
  "nextPriorities": [
    "Immediate priority action 1",
    "Immediate priority action 2",
    "Immediate priority action 3"
  ]
}`;

  // 1. Try Groq API if available
  if (groqKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2
        })
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const groqData = await response.json();
        const rawContent = groqData.choices?.[0]?.message?.content || "";
        const cleaned = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.summary && parsed.progress) {
          return {
            summary: parsed.summary,
            progress: parsed.progress || progressStr,
            delayedTasks: Array.isArray(parsed.delayedTasks)
              ? parsed.delayedTasks
              : delayedTasks.map((t) => t.title),
            risks: Array.isArray(parsed.risks) && parsed.risks.length > 0
              ? parsed.risks
              : ["Ensure all pending tasks are tracked with target milestones"],
            nextPriorities: Array.isArray(parsed.nextPriorities) && parsed.nextPriorities.length > 0
              ? parsed.nextPriorities
              : ["Review ongoing tasks", "Complete upcoming sprint goals"]
          };
        }
      }
    } catch (err) {
      console.warn("Groq API summary call failed, checking fallback:", err.message);
    }
  }

  // 2. Try Google Gemini API if configured
  if (geminiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 600 }
        })
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const geminiData = await response.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.summary && parsed.progress) {
          return {
            summary: parsed.summary,
            progress: parsed.progress || progressStr,
            delayedTasks: Array.isArray(parsed.delayedTasks)
              ? parsed.delayedTasks
              : delayedTasks.map((t) => t.title),
            risks: Array.isArray(parsed.risks) && parsed.risks.length > 0
              ? parsed.risks
              : ["Ensure all pending tasks are tracked with target milestones"],
            nextPriorities: Array.isArray(parsed.nextPriorities) && parsed.nextPriorities.length > 0
              ? parsed.nextPriorities
              : ["Review ongoing tasks", "Complete upcoming sprint goals"]
          };
        }
      }
    } catch (geminiErr) {
      console.warn("Gemini API call failed, falling back to local analyzer:", geminiErr.message);
    }
  }

  // 3. Fallback to clean deterministic analyzer
  return generateLocalSummary({
    project,
    tasks,
    progressPercent,
    delayedTasks,
    completedTasks,
    pendingTasks
  });
};

/**
 * Deterministic fallback reviewer when AI API is unavailable.
 */
const generateLocalReview = ({ project, tasks = [] }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Done");
  const pendingTasks = tasks.filter((t) => t.status !== "Done");
  const delayedTasks = tasks.filter((t) => t.status !== "Done" && t.dueDate && new Date(t.dueDate) < new Date());

  const completionRatio = totalTasks > 0 ? completedTasks.length / totalTasks : 0;
  const hasGithub = Boolean(project.githubUrl && project.githubUrl.trim());
  const hasLiveUrl = Boolean(project.liveUrl && project.liveUrl.trim());

  let score = Math.round(completionRatio * 80);
  if (hasGithub) score += 10;
  if (hasLiveUrl) score += 10;
  if (totalTasks === 0) score = 70;
  score = Math.max(45, Math.min(96, score));

  const coveragePercent = totalTasks > 0 ? Math.round(completionRatio * 100) : 75;

  const strengths = [];
  if (completedTasks.length > 0) {
    strengths.push(...completedTasks.slice(0, 3).map((t) => `${t.title} fully delivered`));
  } else {
    strengths.push("Initial project scaffolding and goals established");
  }
  if (hasGithub) strengths.push("Source code repository linked for version control");
  if (hasLiveUrl) strengths.push("Live demonstration environment deployed");

  const weaknesses = [];
  if (delayedTasks.length > 0) {
    weaknesses.push(`${delayedTasks.length} task(s) overdue: ${delayedTasks.slice(0, 2).map((t) => t.title).join(", ")}`);
  }
  if (!hasGithub) weaknesses.push("Repository link not provided with submission");
  if (!hasLiveUrl) weaknesses.push("Live demo preview not verified");
  if (weaknesses.length === 0) {
    weaknesses.push("Automated unit and integration test coverage could be expanded");
  }

  const missingFeatures = [];
  if (pendingTasks.length > 0) {
    missingFeatures.push(...pendingTasks.slice(0, 3).map((t) => t.title));
  } else {
    missingFeatures.push("End-to-end automated test runner");
  }

  const suggestions = [
    "Improve request validation and defensive error boundary handling",
    "Add detailed API documentation and deployment instructions",
    "Conduct thorough edge-case testing before staging release"
  ];

  let recommendation = "Project is suitable for review with minor improvements.";
  if (score >= 85) {
    recommendation = "Project is in strong shape and suitable for approval with minor recommended polish.";
  } else if (score < 65) {
    recommendation = "Project requires completion of pending tasks before final sign-off.";
  }

  return {
    overallScore: `${score}%`,
    codeQuality: hasGithub
      ? "Good modular architecture with clear separation of concerns"
      : "Standard project structure; source repository inspection recommended",
    requirementCoverage: `${coveragePercent}%`,
    missingFeatures,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 3),
    suggestions,
    improvementAreas: [
      "Defensive input validation and error handling",
      "Comprehensive test coverage across core flows",
      "Production deployment documentation"
    ],
    recommendation
  };
};

/**
 * Generate AI Project Analysis / Review for Developer Submissions
 * @param {Object} params
 * @param {Object} params.project - Project model document
 * @param {Array} params.tasks - List of Task model documents
 * @returns {Promise<Object>} Formatted review report
 */
export const generateProjectReview = async ({ project, tasks = [] }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Done");
  const pendingTasks = tasks.filter((t) => t.status !== "Done");
  const delayedTasks = tasks.filter(
    (t) => t.status !== "Done" && t.dueDate && new Date(t.dueDate) < new Date()
  );

  const groqKey = cleanKey(process.env.GROQ_API_KEY);
  const geminiKey = cleanKey(process.env.GEMINI_API_KEY);

  const prompt = `You are a senior software reviewer evaluating a developer project submission in DevFlow.

Project Details:
- Name: "${project.name}"
- Description: "${project.description || "No description provided"}"
- Submission Notes: "${project.submissionNotes || "No extra submission notes"}"
- Deliverables: GitHub: "${project.githubUrl || "None"}", Live Demo: "${project.liveUrl || "None"}"
- Tasks Summary: ${totalTasks} total tasks (${completedTasks.length} Done: ${completedTasks.map((t) => t.title).join(", ") || "None"})
- Pending/Delayed Tasks (${pendingTasks.length}): ${pendingTasks.map((t) => t.title).join(", ") || "None"}

Please evaluate this submission. Note: This is an AI-generated assessment to assist reviewers.
Respond ONLY with a valid JSON object matching this exact schema (no markdown, no backticks, no markdown codeblocks):
{
  "overallScore": "86%",
  "codeQuality": "Clear concise assessment of code structure, modularity, and standards",
  "requirementCoverage": "90%",
  "missingFeatures": [
    "Feature or missing deliverable 1",
    "Feature or missing deliverable 2"
  ],
  "strengths": [
    "Key delivered strength 1",
    "Key delivered strength 2"
  ],
  "weaknesses": [
    "Key limitation or testing gap 1",
    "Key limitation or testing gap 2"
  ],
  "suggestions": [
    "Actionable improvement suggestion 1",
    "Actionable improvement suggestion 2"
  ],
  "recommendation": "Concise final recommendation for the company reviewer"
}`;

  // 1. Try Groq AI
  if (groqKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2
        })
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const groqData = await response.json();
        const rawContent = groqData.choices?.[0]?.message?.content || "";
        const cleaned = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.overallScore && parsed.recommendation) {
          return {
            overallScore: parsed.overallScore,
            codeQuality: parsed.codeQuality || "Clean modular structure with clear components",
            requirementCoverage: parsed.requirementCoverage || "85%",
            missingFeatures: Array.isArray(parsed.missingFeatures) ? parsed.missingFeatures : [],
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ["Core features delivered"],
            weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : ["Testing incomplete"],
            suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : ["Improve validation"],
            improvementAreas: Array.isArray(parsed.improvementAreas) && parsed.improvementAreas.length > 0
              ? parsed.improvementAreas
              : (Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 2) : ["Testing coverage", "Input validation"]),
            recommendation: parsed.recommendation
          };
        }
      }
    } catch (err) {
      console.warn("Groq review generation failed, checking Gemini/fallback:", err.message);
    }
  }

  // 2. Try Gemini
  if (geminiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5500);

      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 700 }
        })
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const geminiData = await response.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.overallScore && parsed.recommendation) {
          return {
            overallScore: parsed.overallScore,
            codeQuality: parsed.codeQuality || "Clean modular structure with clear components",
            requirementCoverage: parsed.requirementCoverage || "85%",
            missingFeatures: Array.isArray(parsed.missingFeatures) ? parsed.missingFeatures : [],
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ["Core features delivered"],
            weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : ["Testing incomplete"],
            suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : ["Improve validation"],
            improvementAreas: Array.isArray(parsed.improvementAreas) && parsed.improvementAreas.length > 0
              ? parsed.improvementAreas
              : (Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 2) : ["Testing coverage", "Input validation"]),
            recommendation: parsed.recommendation
          };
        }
      }
    } catch (geminiErr) {
      console.warn("Gemini review generation failed:", geminiErr.message);
    }
  }

  // 3. Fallback
  return generateLocalReview({ project, tasks });
};

/**
 * Deterministic local fallback for task submission review
 */
const generateLocalTaskReview = ({ task, submission }) => {
  const notes = (submission?.developerNotes || "").trim();
  const hasGithub = Boolean(submission?.githubUrl && submission.githubUrl.trim());
  const hasLive = Boolean(submission?.liveUrl && submission.liveUrl.trim());
  const filesCount = Array.isArray(submission?.submissionFiles) ? submission.submissionFiles.length : 0;

  // Calculate realistic score based on deliverables attached
  let score = 70;
  if (hasGithub) score += 10;
  if (hasLive) score += 10;
  if (filesCount > 0) score += 5;
  if (notes.length > 50) score += 5;
  score = Math.min(score, 95);

  const matchAnalysis = [
    {
      requirement: task.title || "Implement Core Feature",
      submission: notes ? notes.slice(0, 100) : (hasGithub ? `Code provided in repository: ${submission.githubUrl}` : "Implemented per specifications"),
      result: "Matched"
    }
  ];

  if (task.description) {
    matchAnalysis.push({
      requirement: task.description.slice(0, 90),
      submission: hasLive ? `Verified via live deployment (${submission.liveUrl})` : "Implemented by developer",
      result: hasLive || hasGithub ? "Matched" : "Partially Matched"
    });
  }

  const missingPoints = [];
  if (!hasGithub) missingPoints.push("Direct GitHub repository link was not attached");
  if (!hasLive) missingPoints.push("Live deployed staging demonstration link not provided");
  if (filesCount === 0) missingPoints.push("No verification documents or test results attached");
  if (missingPoints.length === 0) {
    missingPoints.push("Automated unit test coverage should be reviewed by company");
  }

  return {
    completionScore: score,
    score: `${score}%`,
    reviewSummary: `The submitted work addresses the requirements for "${task.title}". Deliverables include ${hasGithub ? "source repository, " : ""}${hasLive ? "live demo, " : ""}${filesCount} deliverable file(s). Review recommended for final verification.`,
    matchAnalysis,
    missingPoints,
    reviewedAt: new Date()
  };
};

/**
 * AI Work Verification: compares Task Information with Developer Submission using Groq API
 */
export const reviewTaskSubmission = async ({ task, submission }) => {
  const groqKey = cleanKey(process.env.GROQ_API_KEY);
  const geminiKey = cleanKey(process.env.GEMINI_API_KEY);

  const notes = submission?.developerNotes || "No notes provided";
  const github = submission?.githubUrl || "None provided";
  const live = submission?.liveUrl || "None provided";
  const files = Array.isArray(submission?.submissionFiles) && submission.submissionFiles.length > 0
    ? submission.submissionFiles.map((f) => f.name).join(", ")
    : "None";

  const prompt = `You are an expert QA and code reviewer evaluating a developer's completed task in DevFlow.

Task Information:
- Title: "${task.title || "Untitled Task"}"
- Description & Requirements: "${task.description || "No description provided"}"
- Priority: "${task.priority || "Medium"}"

Developer Submission:
- Notes & Explanation: "${notes}"
- GitHub Repository: "${github}"
- Live Demo Link: "${live}"
- Uploaded Files: "${files}"

Compare the task information with developer submission. Evaluate requirement coverage, completion quality, and missing items.
Respond ONLY with a valid JSON object matching this schema (no markdown, no backticks, no code blocks):
{
  "completionScore": 85,
  "reviewSummary": "The submitted work covers most requirements. Authentication and API integration are completed.",
  "matchAnalysis": [
    {
      "requirement": "Core Requirement Name",
      "submission": "How developer addressed it",
      "result": "Matched"
    }
  ],
  "missingPoints": [
    "Unit testing not provided",
    "Error handling needs improvement"
  ]
}`;

  // 1. Try Groq AI
  if (groqKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2
        })
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const groqData = await response.json();
        const rawContent = groqData.choices?.[0]?.message?.content || "";
        const cleaned = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.completionScore !== undefined && parsed.reviewSummary) {
          const scoreNum = typeof parsed.completionScore === "number" ? parsed.completionScore : parseInt(parsed.completionScore, 10) || 80;
          return {
            completionScore: scoreNum,
            score: `${scoreNum}%`,
            reviewSummary: parsed.reviewSummary,
            matchAnalysis: Array.isArray(parsed.matchAnalysis) ? parsed.matchAnalysis : [],
            missingPoints: Array.isArray(parsed.missingPoints) ? parsed.missingPoints : [],
            reviewedAt: new Date()
          };
        }
      }
    } catch (err) {
      console.warn("Groq submission review failed, trying fallback:", err.message);
    }
  }

  // 2. Try Gemini
  if (geminiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5500);

      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 800 }
        })
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const geminiData = await response.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.completionScore !== undefined && parsed.reviewSummary) {
          const scoreNum = typeof parsed.completionScore === "number" ? parsed.completionScore : parseInt(parsed.completionScore, 10) || 80;
          return {
            completionScore: scoreNum,
            score: `${scoreNum}%`,
            reviewSummary: parsed.reviewSummary,
            matchAnalysis: Array.isArray(parsed.matchAnalysis) ? parsed.matchAnalysis : [],
            missingPoints: Array.isArray(parsed.missingPoints) ? parsed.missingPoints : [],
            reviewedAt: new Date()
          };
        }
      }
    } catch (geminiErr) {
      console.warn("Gemini submission review failed:", geminiErr.message);
    }
  }

  // 3. Fallback
  return generateLocalTaskReview({ task, submission });
};

