import Workspace from "../models/workspace.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import Comment from "../models/comment.model.js";
import ActivityLog from "../models/activityLog.model.js";

// Helper function to get project filter for tasks based on user role
const getUserProjectFilter = async (user) => {
  if (user.role === "admin") {
    return {};
  }
  const userProjects = await Project.find({
    $or: [{ members: user._id }, { owner: user._id }]
  }).select("_id");
  const projectIds = userProjects.map((p) => p._id);
  return { project: { $in: projectIds } };
};

// @desc    Get dashboard overview counts (workspaces, projects, tasks, comments)
// @route   GET /api/v1/dashboard/overview
// @access  Private
export const getOverview = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === "admin";

    let totalWorkspaces = 0;
    let totalProjects = 0;
    let totalTasks = 0;
    let totalComments = 0;

    if (isAdmin) {
      totalWorkspaces = await Workspace.countDocuments();
      totalProjects = await Project.countDocuments();
      totalTasks = await Task.countDocuments();
      totalComments = await Comment.countDocuments();
    } else {
      totalWorkspaces = await Workspace.countDocuments({ members: req.user._id });
      totalProjects = await Project.countDocuments({
        $or: [{ members: req.user._id }, { owner: req.user._id }]
      });

      const userProjects = await Project.find({
        $or: [{ members: req.user._id }, { owner: req.user._id }]
      }).select("_id");
      const projectIds = userProjects.map((p) => p._id);

      totalTasks = await Task.countDocuments({ project: { $in: projectIds } });

      const userTasks = await Task.find({ project: { $in: projectIds } }).select("_id");
      const taskIds = userTasks.map((t) => t._id);

      totalComments = await Comment.countDocuments({ task: { $in: taskIds } });
    }

    let activeProjects = 0;
    let completedProjects = 0;
    let applicants = 0;
    let acceptedDevelopers = 0;
    let pendingReviews = 0;

    if (req.user.role === "company") {
      const companyProjects = await Project.find({ owner: req.user._id });
      totalProjects = companyProjects.length;
      activeProjects = companyProjects.filter((p) => p.status === "Active").length;
      completedProjects = companyProjects.filter((p) => p.status === "Completed").length;
      pendingReviews = companyProjects.filter((p) => ["Submitted", "Under Review"].includes(p.submissionStatus)).length;

      const acceptedDevSet = new Set();
      let totalApplicants = 0;
      companyProjects.forEach((p) => {
        if (Array.isArray(p.developerResponses)) {
          totalApplicants += p.developerResponses.length;
          p.developerResponses.forEach((r) => {
            if (r.status === "Accepted" && r.developer) {
              acceptedDevSet.add(r.developer.toString());
            }
          });
        }
      });
      applicants = totalApplicants;
      acceptedDevelopers = acceptedDevSet.size;
    }

    const overviewData = {
      totalWorkspaces,
      totalProjects,
      totalTasks,
      totalComments,
      activeProjects,
      completedProjects,
      applicants,
      acceptedDevelopers,
      pendingReviews
    };

    return res.status(200).json({
      success: true,
      message: "Dashboard overview fetched successfully",
      data: {
        ...overviewData,
        overview: overviewData
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get task counts grouped by status (Todo, In Progress, Done)
// @route   GET /api/v1/dashboard/task-status
// @access  Private
export const getTaskStatus = async (req, res, next) => {
  try {
    const taskFilter = await getUserProjectFilter(req.user);

    const todo = await Task.countDocuments({ ...taskFilter, status: "Todo" });
    const inProgress = await Task.countDocuments({ ...taskFilter, status: "In Progress" });
    const submittedForReview = await Task.countDocuments({
      ...taskFilter,
      status: "Submitted For Review"
    });
    const approved = await Task.countDocuments({ ...taskFilter, status: "Approved" });
    const completed = await Task.countDocuments({
      ...taskFilter,
      status: { $in: ["Completed", "Done"] }
    });
    const done = await Task.countDocuments({
      ...taskFilter,
      status: { $in: ["Completed", "Done", "Approved"] }
    });

    return res.status(200).json({
      success: true,
      message: "Task status counts fetched successfully",
      data: {
        todo,
        inProgress,
        submittedForReview,
        approved,
        completed,
        done
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get task counts grouped by priority (High, Medium, Low)
// @route   GET /api/v1/dashboard/task-priority
// @access  Private
export const getTaskPriority = async (req, res, next) => {
  try {
    const taskFilter = await getUserProjectFilter(req.user);

    const high = await Task.countDocuments({ ...taskFilter, priority: "High" });
    const medium = await Task.countDocuments({ ...taskFilter, priority: "Medium" });
    const low = await Task.countDocuments({ ...taskFilter, priority: "Low" });

    return res.status(200).json({
      success: true,
      message: "Task priority counts fetched successfully",
      data: {
        high,
        medium,
        low
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get latest 5 tasks with project and assigned user populated
// @route   GET /api/v1/dashboard/recent-tasks
// @access  Private
export const getRecentTasks = async (req, res, next) => {
  try {
    const taskFilter = await getUserProjectFilter(req.user);

    const tasks = await Task.find(taskFilter)
      .populate("project", "name")
      .populate("assignedTo", "name email avatar profilePicture")
      .sort({ createdAt: -1 })
      .limit(5);

    return res.status(200).json({
      success: true,
      message: "Recent tasks fetched successfully",
      data: {
        tasks
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get latest 10 activities with user and task populated
// @route   GET /api/v1/dashboard/recent-activities
// @access  Private
export const getRecentActivities = async (req, res, next) => {
  try {
    let activityFilter = {};

    if (req.user.role !== "admin") {
      const userProjects = await Project.find({
        $or: [{ members: req.user._id }, { owner: req.user._id }]
      }).select("_id");
      const projectIds = userProjects.map((p) => p._id);
      activityFilter = { project: { $in: projectIds } };
    }

    const activities = await ActivityLog.find(activityFilter)
      .populate("user", "name email avatar profilePicture")
      .populate("task", "title")
      .populate("project", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      message: "Recent activities fetched successfully",
      data: {
        activities
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks assigned to logged-in user
// @route   GET /api/v1/dashboard/my-tasks
// @access  Private
export const getMyTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user._id })
      .populate("project", "name")
      .populate("workspace", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "My tasks fetched successfully",
      data: {
        tasks
      }
    });
  } catch (error) {
    next(error);
  }
};
