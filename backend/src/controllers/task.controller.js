import mongoose from "mongoose";
import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import Workspace from "../models/workspace.model.js";
import User from "../models/user.model.js";
import ActivityLog from "../models/activityLog.model.js";
import Notification from "../models/notification.model.js";
import { emitNotification } from "../sockets/socket.js";

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

      // Create notification for assigned user (if not self-assigned)
      if (assignedUserId.toString() !== req.user._id.toString()) {
        const notification = await Notification.create({
          recipient: assignedUserId,
          sender: req.user._id,
          type: "TASK_ASSIGNED",
          message: `${req.user.name || "User"} assigned you a new task: ${task.title}`,
          task: task._id
        });
        emitNotification(assignedUserId, notification);
      }
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
            tasks: [],
            pagination: {
              currentPage: 1,
              totalPages: 0,
              totalTasks: 0
            }
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

    // Optional filter: assignedTo
    if (req.query.assignedTo) {
      if (mongoose.Types.ObjectId.isValid(req.query.assignedTo)) {
        filter.assignedTo = req.query.assignedTo;
      } else {
        // Non-matching assignedTo when invalid user ID is provided
        filter.assignedTo = new mongoose.Types.ObjectId();
      }
    }

    // Optional search: title or description
    if (req.query.search && req.query.search.trim()) {
      const escapedSearch = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex }
      ];
    }

    // Pagination
    const page = parseInt(req.query.page, 10) > 0 ? parseInt(req.query.page, 10) : 1;
    const limit = parseInt(req.query.limit, 10) > 0 ? parseInt(req.query.limit, 10) : 10;
    const skip = (page - 1) * limit;

    const totalTasks = await Task.countDocuments(filter);
    const totalPages = Math.ceil(totalTasks / limit);

    const tasks = await Task.find(filter)
      .populate("project", "name")
      .populate("workspace", "name")
      .populate("assignedTo", "name email avatar profilePicture skills")
      .populate("createdBy", "name email avatar profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: "Tasks fetched successfully",
      data: {
        tasks,
        pagination: {
          currentPage: page,
          totalPages,
          totalTasks
        }
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
      .populate("assignedTo", "name email avatar profilePicture skills")
      .populate("createdBy", "name email avatar profilePicture");

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

    const previousStatus = task.status;
    const previousAssignedTo = task.assignedTo ? task.assignedTo.toString() : null;

    // Role and ownership authorization
    const isAdmin = req.user.role === "admin";
    const isManager = req.user.role === "manager";
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isProjectOwner = task.project?.owner?.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo && task.assignedTo.toString() === req.user._id.toString();

    if (!isAdmin && !isManager && !isCreator && !isProjectOwner && !isAssigned) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to perform this action"
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

    // Developers can only update status of their own assigned tasks
    if (req.user.role === "developer" && !isAdmin && !isManager && !isProjectOwner && !isCreator) {
      // Developer cannot reassign tasks to others
      if (assignedTo !== undefined) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to perform this action"
        });
      }
      // Developer cannot change title, description, priority, or due date
      if (title !== undefined || description !== undefined || priority !== undefined || dueDate !== undefined) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to perform this action"
        });
      }
    }

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
    await task.populate("assignedTo", "name email avatar profilePicture skills");
    await task.populate("createdBy", "name email avatar profilePicture");

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

      // Notify newly assigned user
      const assignedUserId = task.assignedTo?._id
        ? task.assignedTo._id.toString()
        : task.assignedTo
        ? task.assignedTo.toString()
        : null;

      if (assignedUserId && assignedUserId !== req.user._id.toString()) {
        const notification = await Notification.create({
          recipient: assignedUserId,
          sender: req.user._id,
          type: "TASK_ASSIGNED",
          message: `${req.user.name || "User"} assigned you a new task: ${task.title}`,
          task: task._id
        });
        emitNotification(assignedUserId, notification);
      }
    }

    // Log activity & Create Notification: Task Status Changed
    if (status !== undefined) {
      await ActivityLog.create({
        user: req.user._id,
        project: taskProjectId,
        task: task._id,
        action: "TASK_STATUS_CHANGED",
        description: `${req.user.name || "User"} changed status of task "${task.title}" to ${task.status}`
      });

      // Notify task creator and assigned user (if exists)
      const recipientsToNotify = new Set();
      const creatorId = task.createdBy?._id
        ? task.createdBy._id.toString()
        : task.createdBy
        ? task.createdBy.toString()
        : null;
      const assigneeId = task.assignedTo?._id
        ? task.assignedTo._id.toString()
        : task.assignedTo
        ? task.assignedTo.toString()
        : null;

      if (creatorId) {
        recipientsToNotify.add(creatorId);
      }
      if (assigneeId) {
        recipientsToNotify.add(assigneeId);
      }

      for (const recipientId of recipientsToNotify) {
        const notification = await Notification.create({
          recipient: recipientId,
          sender: req.user._id,
          type: "TASK_STATUS_CHANGED",
          message: `Task ${task.title} status changed to ${task.status}`,
          task: task._id
        });
        emitNotification(recipientId, notification);
      }
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

    // Authorization: Admin, Manager, Project Owner, or Task Creator
    const isAdmin = req.user.role === "admin";
    const isManager = req.user.role === "manager";
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isProjectOwner = task.project?.owner?.toString() === req.user._id.toString();

    if (!isAdmin && !isManager && !isCreator && !isProjectOwner) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to perform this action"
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
