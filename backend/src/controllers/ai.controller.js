import User from "../models/user.model.js";
import Task from "../models/task.model.js";
import Project from "../models/project.model.js";

// Domain-aware keyword associations for intelligent matching
const DOMAIN_MAP = {
  auth: ["jwt", "node", "express", "auth", "security", "mongodb", "backend", "token"],
  login: ["jwt", "node", "express", "auth", "backend", "token"],
  api: ["node", "express", "backend", "rest", "mongodb", "java", "spring", "python", "sql", "api"],
  backend: ["node", "express", "backend", "mongodb", "sql", "java", "spring", "python"],
  frontend: ["react", "javascript", "typescript", "frontend", "ui", "tailwind", "html", "css"],
  react: ["react", "javascript", "typescript", "frontend", "redux", "ui", "tailwind"],
  dashboard: ["react", "frontend", "javascript", "ui", "tailwind", "charts"],
  ui: ["react", "javascript", "frontend", "ui", "css", "tailwind"],
  database: ["mongodb", "sql", "postgres", "mongoose", "database", "backend"],
  docker: ["docker", "devops", "kubernetes", "ci/cd", "deployment"],
  devops: ["docker", "kubernetes", "aws", "ci/cd", "deployment", "linux"]
};

// Normalization and strict skill matcher
const normalize = (str) => (str ? str.toLowerCase().replace(/[^a-z0-9]/g, "") : "");

const doesSkillMatch = (normSkill, targetKeyword) => {
  if (!normSkill || !targetKeyword) return false;
  if (normSkill === targetKeyword) return true;
  // Node / Node.js
  if ((normSkill === "node" || normSkill === "nodejs") && (targetKeyword === "node" || targetKeyword === "nodejs")) return true;
  // React / React.js
  if ((normSkill === "react" || normSkill === "reactjs") && (targetKeyword === "react" || targetKeyword === "reactjs")) return true;
  // Java is strictly NOT JavaScript
  if (normSkill === "java" || targetKeyword === "java") {
    return normSkill === targetKeyword;
  }
  // Safe prefix match for length >= 4
  if (normSkill.length >= 4 && targetKeyword.length >= 4) {
    return normSkill.startsWith(targetKeyword) || targetKeyword.startsWith(normSkill);
  }
  return false;
};

// Heuristic pattern generator for task details
const generateLocalSuggestion = (title, userDescription = "") => {
  const lower = (title + " " + userDescription).toLowerCase();

  if (lower.includes("login") || lower.includes("auth") || lower.includes("jwt")) {
    return {
      description: "Implement JWT authentication system.",
      acceptanceCriteria: [
        "User can login",
        "Token generated",
        "Validation works"
      ],
      subtasks: [
        "Create auth route",
        "Validate credentials",
        "Generate token"
      ],
      estimatedTime: "2 Days"
    };
  }

  if (
    lower.includes("dashboard") ||
    lower.includes("chart") ||
    lower.includes("metric") ||
    lower.includes("analytic")
  ) {
    return {
      description: "Create responsive dashboard UI with interactive widgets and metric charts.",
      acceptanceCriteria: [
        "Dashboard metrics render accurately from API",
        "Layout is fully responsive across mobile and desktop",
        "Charts update dynamically with real-time data"
      ],
      subtasks: [
        "Design responsive dashboard layout grid",
        "Build metric summary cards",
        "Integrate chart components with API endpoints"
      ],
      estimatedTime: "3 Days"
    };
  }

  if (
    lower.includes("react") ||
    lower.includes("ui") ||
    lower.includes("component") ||
    lower.includes("frontend") ||
    lower.includes("modal") ||
    lower.includes("page")
  ) {
    return {
      description: `Build responsive and user-friendly interface components for ${title.trim()}.`,
      acceptanceCriteria: [
        "UI is responsive and matches design guidelines",
        "User inputs are validated with clear error feedback",
        "Interactive states (loading, empty, error) are handled"
      ],
      subtasks: [
        "Create reusable component markup and styles",
        "Connect component state with application context",
        "Test across multiple screen viewports"
      ],
      estimatedTime: "2 Days"
    };
  }

  if (
    lower.includes("api") ||
    lower.includes("backend") ||
    lower.includes("endpoint") ||
    lower.includes("crud") ||
    lower.includes("rest")
  ) {
    return {
      description: `Design and implement robust RESTful API endpoints for ${title.trim()}.`,
      acceptanceCriteria: [
        "API endpoints adhere to REST conventions",
        "Request payload is validated with descriptive errors",
        "Access control and authentication verified"
      ],
      subtasks: [
        "Define schema and request validation rules",
        "Implement controller business logic and route handlers",
        "Write integration tests for success and failure cases"
      ],
      estimatedTime: "2 Days"
    };
  }

  if (
    lower.includes("database") ||
    lower.includes("schema") ||
    lower.includes("model") ||
    lower.includes("mongo") ||
    lower.includes("sql")
  ) {
    return {
      description: `Design database schema and optimize queries for ${title.trim()}.`,
      acceptanceCriteria: [
        "Schema enforces data integrity and indexing",
        "Relationships between models properly established",
        "Queries are optimized for high throughput"
      ],
      subtasks: [
        "Draft database schema definition and indexes",
        "Implement data access methods and validations",
        "Run query benchmark and test relationship integrity"
      ],
      estimatedTime: "2 Days"
    };
  }

  if (
    lower.includes("bug") ||
    lower.includes("fix") ||
    lower.includes("issue") ||
    lower.includes("error") ||
    lower.includes("crash")
  ) {
    return {
      description: `Investigate root cause and apply bugfix for ${title.trim()}.`,
      acceptanceCriteria: [
        "Reported bug is resolved and no longer reproducible",
        "No regressions introduced to existing functionality",
        "Automated regression test case added"
      ],
      subtasks: [
        "Reproduce error with debug logging",
        "Identify root cause and write fix",
        "Verify edge cases and run full test suite"
      ],
      estimatedTime: "1 Day"
    };
  }

  // Default clean task template
  return {
    description: `Implement and deliver ${title.trim()} according to project requirements.`,
    acceptanceCriteria: [
      "Core feature functionality is fully working",
      "Edge cases and error states are gracefully handled",
      "Code is reviewed, tested, and ready for deployment"
    ],
    subtasks: [
      "Analyze requirements and design solution approach",
      "Implement core logic and UI components",
      "Conduct manual verification and unit testing"
    ],
    estimatedTime: "2 Days"
  };
};

// @desc    Generate AI task suggestions (description, acceptance criteria, subtasks, estimated time)
// @route   POST /api/v1/ai/task-suggestion
// @access  Private
export const generateTaskSuggestion = async (req, res, next) => {
  try {
    const { title, description } = req.body || {};

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required to generate AI suggestions"
      });
    }

    let suggestion = null;

    // If GEMINI_API_KEY is available in environment, attempt Google Gemini API call
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are a helpful software engineering assistant in a project management tool called DevFlow.
Generate task details for:
Title: "${title.trim()}"
${description ? `Context: "${description.trim()}"` : ""}

Respond ONLY with valid JSON in this exact structure without markdown backticks:
{
  "description": "Short clear overview of the task",
  "acceptanceCriteria": ["Criterion 1", "Criterion 2", "Criterion 3"],
  "subtasks": ["Subtask 1", "Subtask 2", "Subtask 3"],
  "estimatedTime": "X Days"
}`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 500
            }
          })
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const geminiData = await response.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            if (parsed.description && Array.isArray(parsed.subtasks)) {
              suggestion = {
                description: parsed.description,
                acceptanceCriteria: parsed.acceptanceCriteria || [],
                subtasks: parsed.subtasks || [],
                estimatedTime: parsed.estimatedTime || "2 Days"
              };
            }
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini API call bypassed or timed out, using built-in generator:", geminiErr.message);
      }
    }

    // Fallback to built-in rule generator if no Gemini key or Gemini call failed
    if (!suggestion) {
      suggestion = generateLocalSuggestion(title, description);
    }

    return res.status(200).json({
      success: true,
      message: "Task suggestion generated successfully",
      data: suggestion,
      ...suggestion
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Recommend suitable users for a task based on skills, bio, role, and current pending task workload
// @route   POST /api/v1/ai/recommend-users
// @access  Private
export const recommendUsers = async (req, res, next) => {
  try {
    const { title, description, projectId } = req.body || {};

    if (!title && !description) {
      return res.status(400).json({
        success: false,
        message: "Title or description is required for user recommendation"
      });
    }

    // 1. Determine candidate user pool
    let candidates = [];
    if (projectId) {
      const project = await Project.findById(projectId).populate(
        "members",
        "name email role avatar profilePicture skills bio isActive"
      );
      if (project && project.members && project.members.length > 0) {
        candidates = project.members.filter((m) => m && m.isActive !== false);
      }
    }

    // If no project specified or project has no members, evaluate all active users
    if (candidates.length === 0) {
      candidates = await User.find({ isActive: { $ne: false } }).select(
        "name email role avatar profilePicture skills bio isActive"
      );
    }

    if (candidates.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        recommendations: []
      });
    }

    // 2. Aggregate active/pending workload counts (status != 'Done')
    const candidateIds = candidates.map((u) => u._id);
    const pendingAggregation = await Task.aggregate([
      {
        $match: {
          assignedTo: { $in: candidateIds },
          status: { $ne: "Done" }
        }
      },
      {
        $group: {
          _id: "$assignedTo",
          pendingCount: { $sum: 1 }
        }
      }
    ]);

    const workloadMap = {};
    pendingAggregation.forEach((item) => {
      if (item._id) {
        workloadMap[item._id.toString()] = item.pendingCount;
      }
    });

    // 3. Extract words & relevant domain skills from task requirements
    const taskText = `${title || ""} ${description || ""}`.toLowerCase();
    const taskWords = taskText.split(/[^a-z0-9]+/).filter((w) => w.length >= 2);

    const relevantDomainSkills = new Set();
    Object.entries(DOMAIN_MAP).forEach(([key, skillKeywords]) => {
      if (taskWords.some((w) => w === key || (w.length >= 4 && w.startsWith(key)))) {
        skillKeywords.forEach((sk) => relevantDomainSkills.add(sk));
      }
    });

    // 4. Score and evaluate each candidate
    const recommendations = candidates.map((user) => {
      const userSkills = Array.isArray(user.skills) ? user.skills : [];
      const userBio = (user.bio || "").toLowerCase();
      const userRole = (user.role || "developer").toLowerCase();
      const pendingTasks = workloadMap[user._id.toString()] || 0;

      // Identify matching skills using exact & domain matching
      const matchedSkills = [];
      userSkills.forEach((skill) => {
        const normSkill = normalize(skill);
        if (!normSkill) return;

        // Check against task words directly
        const isDirect = taskWords.some((w) => doesSkillMatch(normSkill, w));
        // Check against relevant domain skills
        const isDomain = Array.from(relevantDomainSkills).some((sk) =>
          doesSkillMatch(normSkill, sk)
        );

        if (isDirect || isDomain) {
          matchedSkills.push(skill);
        }
      });

      // Base starting score
      let score = 65;

      // Skills score weighting (+12 to +25 points)
      if (matchedSkills.length >= 3) {
        score += 25;
      } else if (matchedSkills.length === 2) {
        score += 18;
      } else if (matchedSkills.length === 1) {
        score += 12;
      }

      // Bio relevance weighting (+8 points)
      let bioMatched = false;
      const commonBioKeywords = [
        "frontend",
        "backend",
        "fullstack",
        "react",
        "node",
        "api",
        "database",
        "ui",
        "jwt",
        "auth",
        "developer",
        "engineer"
      ];
      for (const kw of commonBioKeywords) {
        if (taskWords.some((w) => doesSkillMatch(w, kw)) && userBio.includes(kw)) {
          bioMatched = true;
          score += 8;
          break;
        }
      }

      // Role relevance weighting (+4 to +6 points)
      if (userRole === "developer") {
        score += 4;
      } else if (
        userRole === "manager" &&
        (taskText.includes("plan") || taskText.includes("lead") || taskText.includes("review"))
      ) {
        score += 6;
      }

      // Workload adjustment (+6 to -18 points)
      let workloadReason = "";
      if (pendingTasks === 0) {
        score += 6;
        workloadReason = "current workload is low";
      } else if (pendingTasks <= 2) {
        score += 1;
        workloadReason = `moderate workload (${pendingTasks} active)`;
      } else {
        const penalty = Math.min(18, (pendingTasks - 2) * 4);
        score -= penalty;
        workloadReason = `has more active tasks (${pendingTasks} pending)`;
      }

      // Clamp score between 40% and 98%
      const matchScore = Math.min(98, Math.max(40, Math.round(score)));

      // Construct human-readable reason matching prompt examples
      let reason = "";
      if (matchedSkills.length > 0 && pendingTasks <= 1) {
        reason = `Skills match with task requirements and current workload is low.`;
      } else if (matchedSkills.length > 0 && pendingTasks > 1) {
        reason = `Good skill match but has more active tasks.`;
      } else if (bioMatched && pendingTasks <= 1) {
        reason = `Bio experience aligns with task requirements and workload is low.`;
      } else if (bioMatched) {
        reason = `Relevant experience in bio matches task requirements but has active tasks.`;
      } else if (pendingTasks === 0) {
        reason = `Available team member with no current active tasks.`;
      } else {
        reason = `Team member with ${pendingTasks} active tasks.`;
      }

      return {
        userId: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.profilePicture || user.avatar || "",
        profilePicture: user.profilePicture || user.avatar || "",
        skills: userSkills,
        bio: user.bio || "",
        pendingTasks,
        matchScore,
        matchedSkills,
        reason
      };
    });

    // 5. Sort candidates in descending order of matchScore
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    return res.status(200).json({
      success: true,
      message: "Recommended users calculated successfully",
      data: recommendations,
      recommendations
    });
  } catch (error) {
    return next(error);
  }
};
