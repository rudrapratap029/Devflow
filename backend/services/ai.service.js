/**
 * AI Service for DevFlow
 * Provides:
 * 1. AI Project Summary - authoritative MongoDB task metrics + Groq progress explanation
 * 2. AI Work Verification - evidence-based comparison of developer submissions against requirements
 */

// Helper to sanitize API key string from .env (stripping quotes and whitespace)
const cleanKey = (val) => (val ? val.replace(/^["'\s]+|["'\s]+$/g, "").trim() : "");

/**
 * Safely parse JSON returned from LLMs, stripping code blocks or markdown wrappers.
 */
export const parseCleanJsonResponse = (text) => {
  if (!text || typeof text !== "string") return null;
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
};

/**
 * Robust Groq Chat Completion caller with model fallback and abort timeout.
 */
export const callGroqChat = async ({ prompt, systemPrompt, temperature = 0.2, maxTokens = 1000 }) => {
  const groqKey = cleanKey(process.env.GROQ_API_KEY);
  if (!groqKey) {
    throw new Error("GROQ_API_KEY is not configured in backend environment");
  }

  // qwen/qwen3.8-27b verified on this account, followed by openai models if needed
  const models = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"];
  let lastError = null;

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const messages = [];
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      messages.push({ role: "user", content: prompt });

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens
        })
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const groqData = await response.json();
        const rawContent = groqData.choices?.[0]?.message?.content || "";
        return { content: rawContent, model };
      } else {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `HTTP ${response.status} ${response.statusText}`;
        lastError = new Error(`Groq API error (${model}): ${errMsg}`);

        // If model not found, forbidden, or rate-limited on output tokens, try next supported model
        if (
          response.status === 404 ||
          response.status === 429 ||
          errMsg.includes("does not exist") ||
          errMsg.includes("access") ||
          errMsg.includes("Rate limit") ||
          errMsg.includes("tokens per minute")
        ) {
          continue;
        }
        break;
      }
    } catch (err) {
      lastError = err;
      if (err.name === "AbortError") {
        lastError = new Error("Groq API request timed out after 12 seconds");
        break;
      }
    }
  }

  throw lastError || new Error("Failed to call Groq API");
};

/**
 * Inspect public GitHub repository accessibility and basic file structure.
 * Never claims code inspection if repository is private or unreachable.
 */
export const checkGitHubRepository = async (githubUrl) => {
  if (!githubUrl || typeof githubUrl !== "string" || !githubUrl.trim()) {
    return { status: "none", message: "No GitHub repository URL provided (optional)" };
  }

  const cleanUrl = githubUrl.trim();
  const match = cleanUrl.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
  if (!match) {
    return {
      status: "invalid_url",
      url: cleanUrl,
      message: "URL is not a recognizable GitHub repository link"
    };
  }

  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, "");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        "User-Agent": "DevFlow-Code-Verifier",
        Accept: "application/vnd.github.v3+json"
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.status === 200) {
      const repoData = await res.json();
      let files = [];
      try {
        const contentsCtrl = new AbortController();
        const cTimeout = setTimeout(() => contentsCtrl.abort(), 2500);
        const contentsRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents`,
          {
            headers: {
              "User-Agent": "DevFlow-Code-Verifier",
              Accept: "application/vnd.github.v3+json"
            },
            signal: contentsCtrl.signal
          }
        );
        clearTimeout(cTimeout);
        if (contentsRes.status === 200) {
          const contentsData = await contentsRes.json();
          if (Array.isArray(contentsData)) {
            files = contentsData.slice(0, 15).map((f) => f.name);
          }
        }
      } catch (cErr) {
        // contents fetch optional
      }

      return {
        status: "accessible",
        url: cleanUrl,
        owner,
        repo,
        description: repoData.description || "",
        language: repoData.language || "Not specified",
        defaultBranch: repoData.default_branch || "main",
        files,
        message: `Public repository accessible (${repoData.language || "Code"}). Top files detected: ${files.join(", ") || "none detected"}.`
      };
    } else if (res.status === 404) {
      return {
        status: "inaccessible",
        url: cleanUrl,
        message: "Repository is private or does not exist (HTTP 404). Source files could not be inspected."
      };
    } else if (res.status === 403) {
      return {
        status: "inaccessible",
        url: cleanUrl,
        message: "GitHub rate limit exceeded or access forbidden (HTTP 403). Source files could not be inspected."
      };
    } else {
      return {
        status: "inaccessible",
        url: cleanUrl,
        message: `GitHub returned HTTP ${res.status}. Source files could not be inspected.`
      };
    }
  } catch (err) {
    return {
      status: "inaccessible",
      url: cleanUrl,
      message: `Failed to connect to GitHub (${err.message}). Source files could not be inspected.`
    };
  }
};

/**
 * Inspect live demonstration URL reachability.
 * States reachability without falsely claiming functional end-to-end UI testing.
 */
export const checkLiveUrl = async (liveUrl) => {
  if (!liveUrl || typeof liveUrl !== "string" || !liveUrl.trim()) {
    return { status: "none", message: "No live demonstration URL provided (optional)" };
  }

  const cleanUrl = liveUrl.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    return {
      status: "invalid_url",
      url: cleanUrl,
      message: "Live URL must begin with http:// or https://"
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(cleanUrl, {
      method: "GET",
      headers: { "User-Agent": "DevFlow-Verifier" },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.status < 400) {
      return {
        status: "accessible",
        url: cleanUrl,
        statusCode: res.status,
        message: `Live demonstration is accessible (HTTP ${res.status}). Reachability confirmed; functional verification requires manual review.`
      };
    } else {
      return {
        status: "unreachable",
        url: cleanUrl,
        statusCode: res.status,
        message: `Live demonstration URL returned HTTP error status ${res.status}.`
      };
    }
  } catch (err) {
    return {
      status: "unreachable",
      url: cleanUrl,
      message: `Live demonstration URL could not be reached (${err.message}).`
    };
  }
};

/**
 * Format and summarize deliverable files
 */
export const summarizeSubmissionFiles = (files = []) => {
  if (!Array.isArray(files) || files.length === 0) {
    return { count: 0, fileList: [], message: "No deliverable files attached" };
  }

  const fileList = files.map((f) => ({
    name: f.name || "Unnamed file",
    fileType: f.fileType || "",
    size: f.size ? `${Math.round(f.size / 1024)} KB` : "Unknown size",
    url: f.url || ""
  }));

  return {
    count: files.length,
    fileList,
    message: `${files.length} file(s) attached: ${fileList.map((f) => `${f.name} (${f.fileType || "file"}, ${f.size})`).join(", ")}`
  };
};

/**
 * Calculate authoritative task statistics from actual MongoDB task records.
 * Ensures consistent definitions across dashboard, project details, and AI summaries.
 */
export const calculateProjectTaskStats = (tasks = []) => {
  // Deduplicate by unique task ID to ensure each logical task is counted exactly once
  const taskMap = new Map();
  tasks.forEach((t) => {
    if (t && t._id) {
      taskMap.set(t._id.toString(), t);
    }
  });
  const distinctTasks = Array.from(taskMap.values());
  const totalTasks = distinctTasks.length;

  // Genuine completion status per application rules
  const completedTasks = distinctTasks.filter(
    (t) => t.status === "Completed" || t.status === "Done"
  );
  const inProgressTasks = distinctTasks.filter((t) => t.status === "In Progress");
  const submittedForReviewTasks = distinctTasks.filter(
    (t) => t.status === "Submitted For Review"
  );
  const approvedTasks = distinctTasks.filter((t) => t.status === "Approved");
  const todoTasks = distinctTasks.filter((t) => t.status === "Todo");
  const pendingTasks = distinctTasks.filter(
    (t) => !["Completed", "Done"].includes(t.status)
  );

  const now = new Date();
  const overdueTasks = distinctTasks.filter(
    (t) => !["Completed", "Done"].includes(t.status) && t.dueDate && new Date(t.dueDate) < now
  );

  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  return {
    distinctTasks,
    stats: {
      totalTasks,
      completedTasks: completedTasks.length,
      pendingTasks: pendingTasks.length,
      inProgressTasks: inProgressTasks.length,
      submittedForReviewTasks: submittedForReviewTasks.length,
      approvedTasks: approvedTasks.length,
      todoTasks: todoTasks.length,
      overdueTasks: overdueTasks.length,
      completionPercentage
    },
    completedTasks,
    inProgressTasks,
    submittedForReviewTasks,
    approvedTasks,
    todoTasks,
    pendingTasks,
    overdueTasks,
    completionPercentage
  };
};

/**
 * AI Project Summary
 * 1. Calculates authoritative task counts and progress strictly from database records.
 * 2. Asks Groq to explain the progress, completed work, remaining work, delays, and priorities.
 * 3. Never allows Groq to override authoritative database metrics.
 * 4. Shows clear AI error message if Groq fails while keeping database statistics visible.
 */
export const generateProjectSummary = async ({ project, tasks = [] }) => {
  const taskMetrics = calculateProjectTaskStats(tasks);
  const { stats, completionPercentage } = taskMetrics;
  const progressStr = `${completionPercentage}%`;

  // Safe zero-task handling: return accurate database stats with starting guidance
  if (stats.totalTasks === 0) {
    return {
      stats,
      progress: "0%",
      summary: `Project "${project.name}" has no tasks created yet. Define initial project tasks to start tracking progress.`,
      completedWork: [],
      remainingWork: [],
      tasksAwaitingReview: [],
      delayedTasks: [],
      risks: [
        "No tasks are currently tracked in this project",
        "Delivery schedule and deliverables are undefined"
      ],
      nextPriorities: [
        "Break project scope into actionable tasks",
        "Assign tasks to team members",
        "Establish target delivery milestones"
      ],
      // Backwards-compatible root fields
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      inProgressTasks: 0,
      submittedForReviewTasks: 0,
      approvedTasks: 0,
      overdueTasks: 0,
      completionPercentage: 0
    };
  }

  const completedTitles = taskMetrics.completedTasks.map((t) => t.title);
  const inProgressTitles = taskMetrics.inProgressTasks.map((t) => t.title);
  const reviewTitles = taskMetrics.submittedForReviewTasks.map((t) => t.title);
  const overdueTitles = taskMetrics.overdueTasks.map((t) => t.title);
  const pendingTitles = taskMetrics.pendingTasks.map((t) => t.title);

  const prompt = `You are an expert software project manager analyzing project progress in DevFlow.

Verified Database Task Statistics:
- Project Name: "${project.name}"
- Description: "${project.description || "No description provided"}"
- Current Status: "${project.status || "Active"}"
- Total Tasks: ${stats.totalTasks}
- Completed Tasks (${stats.completedTasks}): ${completedTitles.join(", ") || "None"}
- In Progress Tasks (${stats.inProgressTasks}): ${inProgressTitles.join(", ") || "None"}
- Submitted For Review (${stats.submittedForReviewTasks}): ${reviewTitles.join(", ") || "None"}
- Approved Tasks (${stats.approvedTasks})
- Overdue/Delayed Tasks (${stats.overdueTasks}): ${overdueTitles.join(", ") || "None"}
- Calculated Progress: ${progressStr}

Please explain the current progress and priorities based STRICTLY on the data above.
Do NOT invent or alter the task counts or completion percentage.
Respond ONLY with a valid JSON object matching this schema (no markdown, no backticks):
{
  "summary": "1-3 concise sentences summarizing overall project progress, delivery health, and key status",
  "completedWork": ["Key milestone delivered 1"],
  "remainingWork": ["Key pending task 1"],
  "tasksAwaitingReview": ["Task awaiting review 1"],
  "delayedTasks": [${overdueTitles.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(", ")}],
  "risks": [
    "Identified risk or bottleneck supported by the task data"
  ],
  "nextPriorities": [
    "Immediate priority action 1",
    "Immediate priority action 2"
  ]
}`;

  try {
    const { content } = await callGroqChat({ prompt, temperature: 0.2, maxTokens: 800 });
    const parsed = parseCleanJsonResponse(content);

    if (parsed && typeof parsed.summary === "string" && parsed.summary.trim()) {
      return {
        stats,
        // Authoritative database progress is NEVER overridden by AI
        progress: progressStr,
        summary: parsed.summary.trim(),
        completedWork: Array.isArray(parsed.completedWork) && parsed.completedWork.length > 0
          ? parsed.completedWork
          : completedTitles,
        remainingWork: Array.isArray(parsed.remainingWork) && parsed.remainingWork.length > 0
          ? parsed.remainingWork
          : pendingTitles,
        tasksAwaitingReview: Array.isArray(parsed.tasksAwaitingReview)
          ? parsed.tasksAwaitingReview
          : reviewTitles,
        delayedTasks: overdueTitles,
        risks: Array.isArray(parsed.risks) && parsed.risks.length > 0
          ? parsed.risks
          : (overdueTitles.length > 0 ? [`${overdueTitles.length} task(s) have passed target due date`] : ["Keep active tasks updated with clear blockers"]),
        nextPriorities: Array.isArray(parsed.nextPriorities) && parsed.nextPriorities.length > 0
          ? parsed.nextPriorities
          : (inProgressTitles.length > 0 ? [`Complete in-progress tasks: ${inProgressTitles.slice(0, 2).join(", ")}`] : ["Review project tasks and milestones"]),
        // Backwards-compatible root fields
        totalTasks: stats.totalTasks,
        completedTasks: stats.completedTasks,
        pendingTasks: stats.pendingTasks,
        inProgressTasks: stats.inProgressTasks,
        submittedForReviewTasks: stats.submittedForReviewTasks,
        approvedTasks: stats.approvedTasks,
        overdueTasks: stats.overdueTasks,
        completionPercentage: stats.completionPercentage
      };
    }
  } catch (err) {
    console.warn("Groq project summary call failed:", err.message);
  }

  // Graceful fallback on AI error: display real DB stats and transparent AI error notice
  return {
    stats,
    progress: progressStr,
    summary: `Project "${project.name}" is ${completionPercentage}% complete with ${stats.completedTasks} of ${stats.totalTasks} logical tasks finished.`,
    aiError: "AI summary explanation is currently unavailable (Groq API offline or rate limit). Real database task statistics are displayed accurately above.",
    completedWork: completedTitles,
    remainingWork: pendingTitles,
    tasksAwaitingReview: reviewTitles,
    delayedTasks: overdueTitles,
    risks: overdueTitles.length > 0
      ? [`${overdueTitles.length} task(s) are overdue past their due dates`]
      : ["Ensure all pending tasks are tracked with target milestones"],
    nextPriorities: inProgressTitles.length > 0
      ? [`Focus on in-progress items: ${inProgressTitles.slice(0, 3).join(", ")}`]
      : ["Review project tasks and backlog"],
    totalTasks: stats.totalTasks,
    completedTasks: stats.completedTasks,
    pendingTasks: stats.pendingTasks,
    inProgressTasks: stats.inProgressTasks,
    submittedForReviewTasks: stats.submittedForReviewTasks,
    approvedTasks: stats.approvedTasks,
    overdueTasks: stats.overdueTasks,
    completionPercentage: stats.completionPercentage
  };
};

/**
 * AI Work Verification for Developer Task Submission
 * 1. Retrieves actual task requirements and developer submission deliverables.
 * 2. Checks accessibility of repository, live demo URL, and attached files.
 * 3. Compares verified evidence against task requirements.
 * 4. Displays "Insufficient submission evidence" when evidence is unavailable.
 * 5. Company retains final decision; AI never auto-approves or completes task.
 */
export const reviewTaskSubmission = async ({ task, submission }) => {
  const notes = (submission?.developerNotes || task?.developerNotes || "").trim();
  const githubUrl = (submission?.githubUrl || task?.githubUrl || "").trim();
  const liveUrl = (submission?.liveUrl || task?.liveUrl || "").trim();
  const rawFiles = Array.isArray(submission?.submissionFiles) && submission.submissionFiles.length > 0
    ? submission.submissionFiles
    : (Array.isArray(task?.submissionFiles) ? task.submissionFiles : []);

  // Inspect deliverables
  const [githubCheck, liveCheck] = await Promise.all([
    checkGitHubRepository(githubUrl),
    checkLiveUrl(liveUrl)
  ]);
  const filesSummary = summarizeSubmissionFiles(rawFiles);

  const hasNotes = notes.length > 0;
  const hasGithubAccessible = githubCheck.status === "accessible";
  const hasLiveAccessible = liveCheck.status === "accessible";
  const hasFiles = filesSummary.count > 0;
  const hasAnyEvidence = hasNotes || hasGithubAccessible || hasLiveAccessible || hasFiles;

  // Case: Insufficient submission evidence
  if (!hasAnyEvidence) {
    return {
      isSufficientEvidence: false,
      completionScore: null,
      score: "Insufficient submission evidence",
      requirementCoverage: "N/A - Insufficient evidence",
      codeQuality: "Code inspection not performed: No accessible repository or source files provided",
      reviewSummary: "Insufficient submission evidence to evaluate task completion. No accessible repository, uploaded deliverables, or developer notes were provided.",
      matchAnalysis: [
        {
          requirement: task?.title || "Task Requirement",
          submission: "No submission evidence provided",
          result: "Insufficient Evidence"
        }
      ],
      missingPoints: [
        "No source code repository, uploaded files, or developer notes attached to this submission",
        "Developer implementation notes required to verify requirements"
      ],
      limitations: [
        "Automated assessment cannot verify completion without accessible evidence.",
        "Company reviewer must inspect work directly before taking approval action."
      ],
      reviewedAt: new Date()
    };
  }

  // Construct evidence report for Groq
  const prompt = `You are an expert software QA and code reviewer evaluating a developer's task submission in DevFlow.
CRITICAL EVALUATION GUIDELINES:
1. Base your assessment STRICTLY on the verified submission evidence provided below.
2. Do NOT invent, assume, or hallucinate files, features, tests, or code quality that are not supported by the evidence.
3. If source code was not directly inspected (e.g. repository is private, inaccessible, or no source files attached), explicitly state: "Code inspection not performed: Source files unavailable" in codeQuality, and do NOT claim to have inspected code.
4. If a live URL is accessible, note that reachability was verified, but interactive UI/functional testing requires company verification.
5. If partial evidence is available, provide an honest, evidence-based completionScore (0-100) based strictly on what is verified.
6. The company reviewer always makes the final decision.

Task Information:
- Title: "${task?.title || "Untitled Task"}"
- Requirements / Description: "${task?.description || "No description provided"}"
- Priority: "${task?.priority || "Medium"}"

Verified Submission Evidence:
- Developer Notes: "${notes || "No notes provided"}"
- GitHub Repository Status: "${githubCheck.message}"
- Live Demo Status: "${liveCheck.message}"
- Uploaded Files: "${filesSummary.message}"

Respond ONLY with a valid JSON object matching this exact schema (no markdown, no backticks):
{
  "completionScore": 80,
  "score": "80%",
  "requirementCoverage": "80%",
  "reviewSummary": "Concise evidence-based assessment of submitted work against task requirements.",
  "codeQuality": "Clear assessment if code was inspected, or state that code inspection was not performed.",
  "matchAnalysis": [
    {
      "requirement": "Core Requirement Name",
      "submission": "How developer addressed it based on evidence",
      "result": "Matched"
    }
  ],
  "missingPoints": [
    "Specific missing requirement or unverified deliverable"
  ],
  "limitations": [
    "Specific limitation of the automated assessment"
  ]
}`;

  try {
    const { content } = await callGroqChat({ prompt, temperature: 0.15, maxTokens: 900 });
    const parsed = parseCleanJsonResponse(content);

    if (parsed && parsed.reviewSummary) {
      let scoreNum = null;
      if (typeof parsed.completionScore === "number") {
        scoreNum = Math.min(100, Math.max(0, parsed.completionScore));
      } else if (parsed.completionScore !== null && parsed.completionScore !== undefined) {
        scoreNum = parseInt(parsed.completionScore, 10) || null;
      }

      // Ensure code quality does not falsely claim inspection if repo was inaccessible
      let codeQualityText = parsed.codeQuality || "";
      if (!hasGithubAccessible && (!codeQualityText || !codeQualityText.toLowerCase().includes("not performed"))) {
        codeQualityText = "Code inspection not performed: GitHub repository was private or inaccessible";
      }

      const limitationsList = Array.isArray(parsed.limitations) && parsed.limitations.length > 0
        ? parsed.limitations
        : [];
      if (!hasGithubAccessible && !limitationsList.some((l) => l.toLowerCase().includes("repository") || l.toLowerCase().includes("code"))) {
        limitationsList.push("Source repository was inaccessible; evaluation relies on notes and uploaded deliverables.");
      }
      if (hasLiveAccessible && !limitationsList.some((l) => l.toLowerCase().includes("ui") || l.toLowerCase().includes("functional"))) {
        limitationsList.push("Live demo reachability verified; user interaction and edge cases require company inspection.");
      }

      return {
        isSufficientEvidence: true,
        completionScore: scoreNum,
        score: scoreNum !== null ? `${scoreNum}%` : (parsed.score || "Evaluated"),
        requirementCoverage: parsed.requirementCoverage || (scoreNum !== null ? `${scoreNum}%` : "Partial"),
        reviewSummary: parsed.reviewSummary,
        codeQuality: codeQualityText || "Standard deliverable review",
        matchAnalysis: Array.isArray(parsed.matchAnalysis) ? parsed.matchAnalysis : [],
        missingPoints: Array.isArray(parsed.missingPoints) ? parsed.missingPoints : [],
        limitations: limitationsList,
        reviewedAt: new Date()
      };
    }
  } catch (err) {
    console.warn("Groq submission review failed:", err.message);
  }

  // Transparent fallback when AI API is unavailable: do NOT fabricate fake scores
  const fallbackMatch = [
    {
      requirement: task?.title || "Task Requirement",
      submission: notes ? notes.slice(0, 120) : (hasFiles ? filesSummary.message : "Deliverables attached"),
      result: hasNotes || hasFiles ? "Partially Verified" : "Unverified"
    }
  ];

  return {
    isSufficientEvidence: true,
    completionScore: null,
    score: "Pending Manual Review",
    requirementCoverage: "Pending Manual Review",
    codeQuality: hasGithubAccessible
      ? "GitHub repository accessible for manual inspection"
      : "Source code inspection not performed (repository private or unavailable)",
    reviewSummary: `Deliverables submitted: ${hasNotes ? "Developer notes, " : ""}${hasGithubAccessible ? "GitHub repository, " : ""}${hasLiveAccessible ? "live demo, " : ""}${filesSummary.count} file(s). Automated AI service temporarily offline; manual company review recommended.`,
    matchAnalysis: fallbackMatch,
    missingPoints: [
      "AI automated review service temporarily offline - company review required for final sign-off"
    ],
    limitations: [
      "Automated evaluation could not complete. Submitted assets are recorded for reviewer inspection."
    ],
    reviewedAt: new Date()
  };
};

/**
 * AI Project Analysis / Review for Developer Submission at the Project Level
 */
export const generateProjectReview = async ({ project, tasks = [] }) => {
  const notes = (project?.submissionNotes || "").trim();
  const githubUrl = (project?.githubUrl || "").trim();
  const liveUrl = (project?.liveUrl || "").trim();
  const rawFiles = Array.isArray(project?.submissionFiles) ? project.submissionFiles : [];

  const [githubCheck, liveCheck] = await Promise.all([
    checkGitHubRepository(githubUrl),
    checkLiveUrl(liveUrl)
  ]);
  const filesSummary = summarizeSubmissionFiles(rawFiles);
  const taskMetrics = calculateProjectTaskStats(tasks);

  const hasNotes = notes.length > 0;
  const hasGithub = githubCheck.status === "accessible";
  const hasLive = liveCheck.status === "accessible";
  const hasFiles = filesSummary.count > 0;
  const hasEvidence = hasNotes || hasGithub || hasLive || hasFiles || taskMetrics.stats.totalTasks > 0;

  if (!hasEvidence) {
    return {
      overallScore: "Insufficient submission evidence",
      codeQuality: "Code inspection not performed: No repository or source files available",
      requirementCoverage: "N/A - Insufficient evidence",
      missingFeatures: ["No deliverables, repository links, or submission notes provided"],
      strengths: [],
      weaknesses: ["Submission contains no accessible deliverables or evidence"],
      suggestions: ["Provide repository access, demo URL, and project notes before review"],
      improvementAreas: ["Deliverable verification", "Scope documentation"],
      recommendation: "Submission cannot be evaluated due to insufficient evidence. Request developer to provide deliverables.",
      limitations: ["No deliverables were provided to evaluate"],
      analyzedAt: new Date()
    };
  }

  const prompt = `You are a senior software reviewer evaluating a developer's project submission in DevFlow.
CRITICAL GUIDELINES:
- Base evaluation STRICTLY on the verified deliverables below.
- Do NOT invent or claim source code inspection if repository is private or not provided.
- If live URL is accessible, note that reachability was confirmed, but complete testing requires reviewer sign-off.
- The company reviewer retains final authority to approve or request revisions.

Project Details:
- Name: "${project.name}"
- Description: "${project.description || "No description"}"
- Submission Notes: "${notes || "None provided"}"
- GitHub Repository Status: "${githubCheck.message}"
- Live Demo Status: "${liveCheck.message}"
- Uploaded Files: "${filesSummary.message}"
- Tasks Summary: ${taskMetrics.stats.totalTasks} total tasks (${taskMetrics.stats.completedTasks} completed, ${taskMetrics.stats.pendingTasks} pending)

Respond ONLY with a valid JSON object matching this schema (no markdown, no backticks):
{
  "overallScore": "82%",
  "codeQuality": "Clear concise assessment of code structure if evidence exists, or state limitation",
  "requirementCoverage": "85%",
  "missingFeatures": ["Missing deliverable or pending task 1"],
  "strengths": ["Verified delivered feature 1"],
  "weaknesses": ["Key limitation or unverified area 1"],
  "suggestions": ["Actionable improvement suggestion 1"],
  "improvementAreas": ["Key improvement area 1"],
  "recommendation": "Concise final recommendation for the company reviewer",
  "limitations": ["Specific limitation of the automated analysis"]
}`;

  try {
    const { content } = await callGroqChat({ prompt, temperature: 0.2, maxTokens: 850 });
    const parsed = parseCleanJsonResponse(content);

    if (parsed && parsed.recommendation) {
      let codeQualityText = parsed.codeQuality || "";
      if (!hasGithub && (!codeQualityText || !codeQualityText.toLowerCase().includes("not performed"))) {
        codeQualityText = "Code inspection not performed: Repository was private or not accessible";
      }

      return {
        overallScore: parsed.overallScore || "Evaluated",
        codeQuality: codeQualityText || "Standard deliverable review",
        requirementCoverage: parsed.requirementCoverage || "80%",
        missingFeatures: Array.isArray(parsed.missingFeatures) ? parsed.missingFeatures : [],
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ["Core deliverables submitted"],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        improvementAreas: Array.isArray(parsed.improvementAreas) ? parsed.improvementAreas : ["Documentation", "Verification"],
        recommendation: parsed.recommendation,
        limitations: Array.isArray(parsed.limitations) ? parsed.limitations : ["Automated guidance for company review"],
        analyzedAt: new Date()
      };
    }
  } catch (err) {
    console.warn("Groq project review call failed:", err.message);
  }

  // Transparent fallback
  return {
    overallScore: "Pending Manual Review",
    codeQuality: hasGithub
      ? "GitHub repository accessible for manual inspection"
      : "Code inspection not performed (repository private or unavailable)",
    requirementCoverage: `${taskMetrics.completionPercentage}%`,
    missingFeatures: taskMetrics.pendingTasks.map((t) => t.title).slice(0, 3),
    strengths: taskMetrics.completedTasks.map((t) => `${t.title} completed`).slice(0, 3),
    weaknesses: ["AI review service temporarily offline - company review required"],
    suggestions: [
      "Review attached deliverable files and repository directly",
      "Verify live demo in staging environment before final approval"
    ],
    improvementAreas: ["Manual verification required"],
    recommendation: "Automated AI review service is temporarily offline. Review submitted deliverables manually before approval.",
    limitations: ["Automated evaluation service could not be contacted"],
    analyzedAt: new Date()
  };
};
