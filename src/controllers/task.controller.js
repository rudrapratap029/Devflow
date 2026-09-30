import mongoose from "mongoose";
import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import Workspace from "../models/workspace.model.js";
import User from "../models/user.model.js";
import ActivityLog from "../models/activityLog.model.js";

// @desc    Create a new task
// @route   POST /api/v1/tasks
// @access  Private
export const createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      project,
      projectId,
      workspace,
      workspaceId,
      assignedTo,
      status,
      priority,
      dueDate
    } = req.body || {};

    const targetProjectId = project || projectId;
    const targetWorkspaceId = workspace || workspaceId;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required"
      });
    }

    if (!targetProjectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(targetProjectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    // Verify project exists
    const existingProject = await Project.findById(targetProjectId);
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Validate workspace if provided
    if (targetWorkspaceId) {
      if (!mongoose.Types.ObjectId.isValid(targetWorkspaceId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid workspace ID"
        });
      }

      const existingWorkspace = await Workspace.findById(targetWorkspaceId);
      if (!existingWorkspace) {
        return res.status(404).json({
          success: false,
          message: "Workspace not found"
        });
      }
    }

    // Rule: Only project members can create tasks
    const isProjectMember = existingProject.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!isProjectMember) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only project members can create tasks"
      });
    }

    // Validate status if provided
    let taskStatus = "Todo";
    if (status) {
      if (!["Todo", "In Progress", "Done"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be 'Todo', 'In Progress', or 'Done'"
        });
      }
      taskStatus = status;
    }

    // Validate priority if provided
    let taskPriority = "Medium";
    if (priority) {
      if (!["Low", "Medium", "High"].includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Priority must be 'Low', 'Medium', or 'High'"
        });
      }
      taskPriority = priority;
    }

    // Validate assignedTo if provided (must be a member of the project)
    let assignedUserId = null;
    if (assignedTo) {
      if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignedTo user ID"
        });
      }

      const assignedUser = await User.findById(assignedTo);
      if (!assignedUser) {
        return res.status(404).json({
          success: false,
          message: "Assigned user not found"
        });
      }

      const isAssignedMember = existingProject.members.some(
        (memberId) => memberId.toString() === assignedTo.toString()
      );

      if (!isAssignedMember) {
        return res.status(400).json({
          success: false,
          message: "Assigned user must be a member of this project"
        });
      }

      assignedUserId = assignedTo;
    }

    // Automatically derive workspace from project if not explicitly supplied
    const taskWorkspaceId = targetWorkspaceId || existingProject.workspace;

    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      project: targetProjectId,
      workspace: taskWorkspaceId,
      assignedTo: assignedUserId,
      createdBy: req.user._id,
      status: taskStatus,
      priority: taskPriority,
      dueDate: dueDate ? new Date(dueDate) : null
    });

    // Log task creation activity
    await ActivityLog.create({
      user: req.user._id,
      project: targetProjectId,
      task: task._id,
      action: "TASK_CREATED",
      description: `${req.user.name || "User"} created task "${task.title}"`
    });

    if (assignedUserId) {
      await ActivityLog.create({
        user: req.user._id,
        project: targetProjectId,
        task: task._id,
        action: "TASK_ASSIGNED",
        description: `${req.user.name || "User"} assigned task "${task.title}"`
      });
    }

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: {
        task
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tasks for projects where the logged-in user is a member
// @route   GET /api/v1/tasks
// @access  Private
export const getTasks = async (req, res, next) => {
  try {
    // 1. Find all projects where the logged-in user is a member
    const userProjects = await Project.find({ members: req.user._id }).select("_id");
    const userProjectIds = userProjects.map((p) => p._id);

    // 2. Base query: tasks belonging to user's projects
    const filter = { project: { $in: userProjectIds } };

    // Optional filter: project
    const projectFilter = req.query.project || req.query.projectId;
    if (projectFilter && mongoose.Types.ObjectId.isValid(projectFilter)) {
      // Ensure the requested project is one the user is a member of
      const isMemberOfFilteredProject = userProjectIds.some(
        (id) => id.toString() === projectFilter.toString()
      );

      if (isMemberOfFilteredProject) {
        filter.project = projectFilter;
      } else {
        // User requested a project they don't belong to: return empty list
        return res.status(200).json({
          success: true,
          message: "Tasks fetched successfully",
          data: {
            tasks: []
          }
        });
      }
    }

    // Optional filter: status
    if (req.query.status && ["Todo", "In Progress", "Done"].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    // Optional filter: priority
    if (req.query.priority && ["Low", "Medium", "High"].includes(req.query.priority)) {
      filter.priority = req.query.priority;
    }

    const tasks = await Task.find(filter)
      .populate("project", "name")
      .populate("workspace", "name")
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Tasks fetched successfully",
      data: {
        tasks
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task by ID
// @route   GET /api/v1/tasks/:taskId
// @access  Private (Project members only)
export const getTaskById = async (req, res, next) => {
  try {
    const taskId = req.params.taskId || req.params.id;

    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID"
      });
    }

    const task = await Task.findById(taskId)
      .populate("project", "name members owner")
      .populate("workspace", "name")
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Check if logged-in user is a member of the task's project
    const isMember = task.project.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Task fetched successfully",
      data: {
        task
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task details (title, description, status, priority, dueDate, assignedTo)
// @route   PUT /api/v1/tasks/:taskId
// @access  Private (Task creator or Project owner only)
export const updateTask = async (req, res, next) => {
  try {
    const taskId = req.params.taskId || req.params.id;

    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID"
      });
    }

    const task = await Task.findById(taskId).populate("project");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Authorization: only task creator or project owner can update
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isProjectOwner = task.project.owner.toString() === req.user._id.toString();

    if (!isCreator && !isProjectOwner) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the task creator or project owner can update this task"
      });
    }

    const {
      title,
      description,
      status,
      priority,
      dueDate,
      assignedTo
    } = req.body || {};

    let generalUpdated = false;

    // Allow updating: title
    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Task title cannot be empty"
        });
      }
      task.title = title.trim();
      generalUpdated = true;
    }

    // Allow updating: description
    if (description !== undefined) {
      task.description = description.trim();
      generalUpdated = true;
    }

    // Allow updating: status
    if (status !== undefined) {
      if (!["Todo", "In Progress", "Done"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be 'Todo', 'In Progress', or 'Done'"
        });
      }
      task.status = status;
    }

    // Allow updating: priority
    if (priority !== undefined) {
      if (!["Low", "Medium", "High"].includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Priority must be 'Low', 'Medium', or 'High'"
        });
      }
      task.priority = priority;
      generalUpdated = true;
    }

    // Allow updating: dueDate
    if (dueDate !== undefined) {
      task.dueDate = dueDate ? new Date(dueDate) : null;
      generalUpdated = true;
    }

    // Allow updating: assignedTo (must be a member of the project)
    if (assignedTo !== undefined) {
      if (assignedTo === null || assignedTo === "") {
        task.assignedTo = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
          return res.status(400).json({
            success: false,
            message: "Invalid assignedTo user ID"
          });
        }

        const assignedUser = await User.findById(assignedTo);
        if (!assignedUser) {
          return res.status(404).json({
            success: false,
            message: "Assigned user not found"
          });
        }

        const isAssignedMember = task.project.members.some(
          (memberId) => memberId.toString() === assignedTo.toString()
        );

        if (!isAssignedMember) {
          return res.status(400).json({
            success: false,
            message: "Assigned user must be a member of this project"
          });
        }

        task.assignedTo = assignedTo;
      }
    }

    await task.save();

    await task.populate("project", "name");
    await task.populate("workspace", "name");
    await task.populate("assignedTo", "name email avatar");
    await task.populate("createdBy", "name email avatar");

    const taskProjectId = task.project._id || task.project;

    // Log activity: Task Assigned
    if (assignedTo !== undefined) {
      await ActivityLog.create({
        user: req.user._id,
        project: taskProjectId,
        task: task._id,
        action: "TASK_ASSIGNED",
        description: `${req.user.name || "User"} assigned task "${task.title}"`
      });
    }

    // Log activity: Task Status Changed
    if (status !== undefined) {
      await ActivityLog.create({
        user: req.user._id,
        project: taskProjectId,
        task: task._id,
        action: "TASK_STATUS_CHANGED",
        description: `${req.user.name || "User"} changed status of task "${task.title}" to ${task.status}`
      });
    }

    // Log activity: Task Updated
    if (generalUpdated || (status === undefined && assignedTo === undefined)) {
      await ActivityLog.create({
        user: req.user._id,
        project: taskProjectId,
        task: task._id,
        action: "TASK_UPDATED",
        description: `${req.user.name || "User"} updated task "${task.title}"`
      });
    }

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: {
        task
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/v1/tasks/:taskId
// @access  Private (Task creator or Project owner only)
export const deleteTask = async (req, res, next) => {
  try {
    const taskId = req.params.taskId || req.params.id;

    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID"
      });
    }

    const task = await Task.findById(taskId).populate("project");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Authorization: only task creator or project owner can delete
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isProjectOwner = task.project.owner.toString() === req.user._id.toString();

    if (!isCreator && !isProjectOwner) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the task creator or project owner can delete this task"
      });
    }

    await Task.findByIdAndDelete(taskId);

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
