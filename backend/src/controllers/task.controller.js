import mongoose from "mongoose";
import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import Workspace from "../models/workspace.model.js";
import User from "../models/user.model.js";
import ActivityLog from "../models/activityLog.model.js";
import Notification from "../models/notification.model.js";
import { emitNotification, emitTaskUpdated } from "../sockets/socket.js";

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

    // Developer is not allowed to create tasks
    if (req.user.role === "developer") {
      return res.status(403).json({
        success: false,
        message: "Developers are not authorized to create tasks"
      });
    }

    const isAdmin = req.user.role === "admin";
    const isCompany = req.user.role === "company";
    const isProjectOwner = existingProject.owner && existingProject.owner.toString() === req.user._id.toString();
    const isProjectMember = existingProject.members && existingProject.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    // Company can only create tasks inside its own projects
    if (isCompany && !isProjectOwner) {
      return res.status(403).json({
        success: false,
        message: "You can only create tasks in your own company's projects"
      });
    }

    if (!isAdmin && !isProjectOwner && !isProjectMember) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to create tasks in this project"
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

      if (isCompany && existingWorkspace.owner && existingWorkspace.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "You cannot create tasks in another company's workspace"
        });
      }
    }

    // Validate status if provided
    let taskStatus = "Todo";
    const validStatuses = [
      "Todo",
      "In Progress",
      "Submitted For Review",
      "Approved",
      "Completed",
      "Done"
    ];
    if (status) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${validStatuses.join(", ")}`
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

    // Automatically derive workspace from project if not explicitly supplied
    const taskWorkspaceId = targetWorkspaceId || existingProject.workspace;

    // Helper: collect developers who have accepted the project invitation
    const getAcceptedDeveloperIds = (proj) => {
      const ids = [];
      if (Array.isArray(proj.developerResponses)) {
        proj.developerResponses.forEach((resp) => {
          if (
            (resp.status === "Accepted" || resp.status === "In Progress") &&
            resp.developer
          ) {
            const devIdStr = (resp.developer._id || resp.developer).toString();
            if (!ids.includes(devIdStr)) {
              ids.push(devIdStr);
            }
          }
        });
      }
      return ids;
    };

    // Case 1: Company selects "All Accepted Users"
    if (assignedTo === "ALL_ACCEPTED" || req.body.assignToAll === true) {
      const acceptedDevIds = getAcceptedDeveloperIds(existingProject);

      if (acceptedDevIds.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "No developers have accepted this project yet. Tasks can only be assigned to developers who have accepted the project invitation."
        });
      }

      // Create a separate task for every accepted developer
      const createdTasks = [];
      for (const devId of acceptedDevIds) {
        // Ensure developer is in project members
        if (
          !existingProject.members.some(
            (m) => m.toString() === devId.toString()
          )
        ) {
          existingProject.members.push(devId);
        }

        const newTask = await Task.create({
          title: title.trim(),
          description: description ? description.trim() : "",
          project: targetProjectId,
          workspace: taskWorkspaceId,
          assignedTo: devId,
          createdBy: req.user._id,
          status: taskStatus,
          priority: taskPriority,
          dueDate: dueDate ? new Date(dueDate) : null
        });

        createdTasks.push(newTask);

        // Activity log
        await ActivityLog.create({
          user: req.user._id,
          project: targetProjectId,
          task: newTask._id,
          action: "TASK_CREATED",
          description: `${req.user.name || "Company"} created task "${newTask.title}" for accepted developer`
        });

        await ActivityLog.create({
          user: req.user._id,
          project: targetProjectId,
          task: newTask._id,
          action: "TASK_ASSIGNED",
          description: `${req.user.name || "Company"} assigned task "${newTask.title}"`
        });

        // Notification to developer
        try {
          const notification = await Notification.create({
            recipient: devId,
            sender: req.user._id,
            type: "TASK_ASSIGNED",
            message: `${req.user.companyName || req.user.name || "Company"} assigned you a new task: ${newTask.title}`,
            task: newTask._id,
            project: targetProjectId
          });
          emitNotification(devId, notification);
        } catch (notifErr) {
          console.warn("Failed to notify developer:", notifErr.message);
        }
      }

      await existingProject.save();

      return res.status(201).json({
        success: true,
        message: `Task successfully created and assigned to all ${createdTasks.length} accepted developer(s)`,
        data: {
          tasks: createdTasks,
          task: createdTasks[0],
          count: createdTasks.length
        }
      });
    }

    // Case 2: Individual assignment or unassigned
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

      // If Company assigns to an individual user, enforce that the developer accepted the project invitation
      if (isCompany) {
        const acceptedDevIds = getAcceptedDeveloperIds(existingProject);
        if (!acceptedDevIds.includes(assignedTo.toString())) {
          return res.status(400).json({
            success: false,
            message:
              "You can only assign tasks to developers who have accepted the project invitation."
          });
        }
      }

      // Add assigned user to project members if not already present
      const isAssignedMember =
        existingProject.members.some(
          (memberId) => memberId.toString() === assignedTo.toString()
        ) ||
        (existingProject.owner &&
          existingProject.owner.toString() === assignedTo.toString());

      if (!isAssignedMember) {
        existingProject.members.push(assignedTo);
      }

      if (isCompany && Array.isArray(existingProject.developerResponses)) {
        const respIdx = existingProject.developerResponses.findIndex(
          (r) =>
            (r.developer?._id || r.developer).toString() ===
            assignedTo.toString()
        );
        if (respIdx >= 0) {
          if (existingProject.developerResponses[respIdx].status === "Pending") {
            existingProject.developerResponses[respIdx].status = "Accepted";
          }
        }
      }

      await existingProject.save();
      assignedUserId = assignedTo;
    }

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
        try {
          const notification = await Notification.create({
            recipient: assignedUserId,
            sender: req.user._id,
            type: "TASK_ASSIGNED",
            message: `${req.user.companyName || req.user.name || "User"} assigned you a new task: ${task.title}`,
            task: task._id,
            project: targetProjectId
          });
          emitNotification(assignedUserId, notification);
        } catch (notifErr) {
          console.warn("Failed to notify assigned user:", notifErr.message);
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: {
        task,
        tasks: [task]
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
    const isAdmin = req.user.role === "admin";
    const isCompany = req.user.role === "company";
    const isDeveloper = req.user.role === "developer";

    let filter = {};

    if (isAdmin) {
      // Admin sees all tasks across all projects and workspaces
      filter = {};
    } else if (isCompany) {
      // Company only sees tasks in projects it owns or belongs to
      const companyProjects = await Project.find({
        $or: [{ owner: req.user._id }, { members: req.user._id }]
      }).select("_id");
      const companyProjectIds = companyProjects.map((p) => p._id);
      filter = { project: { $in: companyProjectIds } };
    } else if (isDeveloper) {
      // Developer only sees tasks assigned to them
      filter = { assignedTo: req.user._id };
    } else {
      // Default: project members
      const userProjects = await Project.find({ members: req.user._id }).select("_id");
      const userProjectIds = userProjects.map((p) => p._id);
      filter = { project: { $in: userProjectIds } };
    }

    // Optional filter: project
    const projectFilter = req.query.project || req.query.projectId;
    if (projectFilter && mongoose.Types.ObjectId.isValid(projectFilter)) {
      if (isAdmin) {
        filter.project = projectFilter;
      } else if (isCompany) {
        const companyProjects = await Project.find({
          $or: [{ owner: req.user._id }, { members: req.user._id }]
        }).select("_id");
        const companyProjectIds = companyProjects.map((p) => p._id.toString());
        if (companyProjectIds.includes(projectFilter.toString())) {
          filter.project = projectFilter;
        } else {
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
      } else if (isDeveloper) {
        filter.project = projectFilter;
        filter.assignedTo = req.user._id;
      } else {
        const userProjects = await Project.find({ members: req.user._id }).select("_id");
        const userProjectIds = userProjects.map((p) => p._id.toString());
        if (userProjectIds.includes(projectFilter.toString())) {
          filter.project = projectFilter;
        } else {
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
    }

    // Optional filter: status
    if (
      req.query.status &&
      [
        "Todo",
        "In Progress",
        "Submitted For Review",
        "Approved",
        "Completed",
        "Done"
      ].includes(req.query.status)
    ) {
      filter.status = req.query.status;
    }

    // Optional filter: priority
    if (req.query.priority && ["Low", "Medium", "High"].includes(req.query.priority)) {
      filter.priority = req.query.priority;
    }

    // Optional filter: assignedTo (developers cannot change this)
    if (isDeveloper) {
      filter.assignedTo = req.user._id;
    } else if (req.query.assignedTo) {
      if (mongoose.Types.ObjectId.isValid(req.query.assignedTo)) {
        filter.assignedTo = req.query.assignedTo;
      } else {
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
    const limit = parseInt(req.query.limit, 10) > 0 ? parseInt(req.query.limit, 10) : 50;
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

    const isAdmin = req.user.role === "admin";
    const isCompany = req.user.role === "company";
    const isDeveloper = req.user.role === "developer";

    const isProjectOwner =
      task.project?.owner &&
      (task.project.owner._id
        ? task.project.owner._id.toString()
        : task.project.owner.toString()) === req.user._id.toString();

    const isMember =
      task.project?.members &&
      task.project.members.some(
        (memberId) => (memberId._id ? memberId._id.toString() : memberId.toString()) === req.user._id.toString()
      );

    const isCreator =
      task.createdBy &&
      (task.createdBy._id
        ? task.createdBy._id.toString()
        : task.createdBy.toString()) === req.user._id.toString();

    const isAssigned =
      task.assignedTo &&
      (task.assignedTo._id
        ? task.assignedTo._id.toString()
        : task.assignedTo.toString()) === req.user._id.toString();

    if (isAdmin) {
      // Admin has full access to view all tasks
    } else if (isCompany) {
      if (!isProjectOwner && !isCreator && !isMember) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You do not have permission to view tasks in another company's project"
        });
      }
    } else if (isDeveloper) {
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only view tasks assigned to you"
        });
      }
    } else {
      if (!isMember && !isProjectOwner && !isCreator && !isAssigned) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not a member of this project"
        });
      }
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
    const isCompany = req.user.role === "company";
    const isDeveloper = req.user.role === "developer";
    const isManager = req.user.role === "manager";

    const isCreator =
      task.createdBy &&
      (task.createdBy._id
        ? task.createdBy._id.toString()
        : task.createdBy.toString()) === req.user._id.toString();

    const isProjectOwner =
      task.project?.owner &&
      (task.project.owner._id
        ? task.project.owner._id.toString()
        : task.project.owner.toString()) === req.user._id.toString();

    const isAssigned =
      task.assignedTo &&
      (task.assignedTo._id
        ? task.assignedTo._id.toString()
        : task.assignedTo.toString()) === req.user._id.toString();

    // 1. Developers can ONLY edit status of tasks assigned to them
    if (isDeveloper) {
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to update another user's task"
        });
      }

      const { title, description, priority, dueDate, assignedTo } = req.body || {};
      if (
        title !== undefined ||
        description !== undefined ||
        priority !== undefined ||
        dueDate !== undefined ||
        assignedTo !== undefined
      ) {
        return res.status(403).json({
          success: false,
          message: "Developers can only update task status"
        });
      }
    }

    // 2. Company can only manage tasks in its own projects
    if (isCompany && !isProjectOwner && !isCreator) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to edit another company's task"
      });
    }

    // 3. General authorization check
    if (!isAdmin && !isCompany && !isManager && !isCreator && !isProjectOwner && !isAssigned) {
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

    // Allow updating: status (Allowed: Todo, In Progress, Submitted For Review, Approved, Completed, Done)
    const validStatuses = [
      "Todo",
      "In Progress",
      "Submitted For Review",
      "Approved",
      "Completed",
      "Done"
    ];
    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${validStatuses.join(", ")}`
        });
      }

      const normalizedStatus = status === "Done" ? "Completed" : status;

      // 1. Developer Role Restrictions:
      // Developer can ONLY transition: Todo -> In Progress -> Submitted For Review
      // Developer CANNOT directly mark task as Approved or Completed
      if (isDeveloper) {
        if (normalizedStatus === "Approved" || normalizedStatus === "Completed") {
          return res.status(403).json({
            success: false,
            message: "Developers cannot directly mark tasks as Approved or Completed. Please submit your task for company review."
          });
        }

        const devAllowedTransitions = {
          "Todo": ["In Progress", "Todo"],
          "In Progress": ["Submitted For Review", "Todo", "In Progress"],
          "Submitted For Review": ["Submitted For Review"],
          "Approved": ["Approved"],
          "Completed": ["Completed"]
        };

        const allowed = devAllowedTransitions[previousStatus] || ["Todo", "In Progress", "Submitted For Review"];
        if (!allowed.includes(normalizedStatus) && previousStatus !== normalizedStatus) {
          return res.status(400).json({
            success: false,
            message: `Invalid developer status transition from "${previousStatus}" to "${normalizedStatus}". Workflow is: Todo -> In Progress -> Submitted For Review.`
          });
        }
      }

      // 2. Company Role Restrictions:
      // Company cannot change developer work status before submission (Todo or In Progress)
      // Company can change status: Submitted For Review -> Approved -> Completed
      if (isCompany) {
        if (previousStatus === "Todo" || previousStatus === "In Progress") {
          return res.status(403).json({
            success: false,
            message: "Company cannot change developer work status before submission. Task is currently in progress by the developer."
          });
        }

        const companyAllowedStatuses = ["Approved", "Completed", "In Progress"];
        if (!companyAllowedStatuses.includes(normalizedStatus)) {
          return res.status(403).json({
            success: false,
            message: "Companies can only review submitted tasks (Approved, Completed, or Request Revisions)."
          });
        }
      }

      task.status = normalizedStatus;

      // Save respective lifecycle timestamps
      if (normalizedStatus === "Submitted For Review") {
        task.submittedAt = new Date();
      } else if (normalizedStatus === "Approved") {
        task.approvedAt = new Date();
      } else if (normalizedStatus === "Completed") {
        task.completedAt = new Date();
      }
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

    // Allow updating: assignedTo
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

        // If company role, ensure developer has accepted the project invitation
        if (isCompany && task.project) {
          const proj = await Project.findById(task.project._id || task.project);
          const isAccepted =
            Array.isArray(proj?.developerResponses) &&
            proj.developerResponses.some(
              (r) =>
                (r.status === "Accepted" || r.status === "In Progress") &&
                (r.developer?._id || r.developer).toString() ===
                  assignedTo.toString()
            );

          if (!isAccepted) {
            return res.status(400).json({
              success: false,
              message:
                "You can only assign tasks to developers who have accepted the project invitation."
            });
          }
        }

        if (task.project && task.project._id) {
          await Project.findByIdAndUpdate(task.project._id, {
            $addToSet: { members: assignedTo }
          });
        }

        task.assignedTo = assignedTo;
      }
    }

    await task.save();

    await task.populate("project", "name owner");
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
          task: task._id,
          project: taskProjectId
        });
        emitNotification(assignedUserId, notification);
      }
    }

    // Log activity & Create Notification: Task Status Changed
    if (status !== undefined) {
      let actionName = "TASK_STATUS_CHANGED";
      let activityDesc = `${req.user.name || "User"} changed status of task "${task.title}" to ${task.status}`;

      if (task.status === "Submitted For Review") {
        actionName = "TASK_SUBMITTED_FOR_REVIEW";
        activityDesc = `${req.user.name || "Developer"} submitted task "${task.title}" for review`;
      } else if (task.status === "Approved") {
        actionName = "TASK_APPROVED";
        activityDesc = `${req.user.companyName || req.user.name || "Company"} approved task "${task.title}"`;
      } else if (task.status === "Completed") {
        actionName = "TASK_COMPLETED";
        activityDesc = `${req.user.companyName || req.user.name || "Company"} marked task "${task.title}" as Completed`;
      } else if (task.status === "In Progress" && previousStatus === "Submitted For Review") {
        actionName = "TASK_REVISION_REQUESTED";
        activityDesc = `${req.user.companyName || req.user.name || "Company"} requested revisions on task "${task.title}"`;
      }

      await ActivityLog.create({
        user: req.user._id,
        project: taskProjectId,
        task: task._id,
        action: actionName,
        description: activityDesc
      });

      // Target notifications
      if (task.status === "Submitted For Review") {
        // Send notification to project owner / company
        const ownerId = task.project?.owner?._id
          ? task.project.owner._id.toString()
          : task.project?.owner
          ? task.project.owner.toString()
          : task.createdBy?._id
          ? task.createdBy._id.toString()
          : task.createdBy?.toString();

        if (ownerId && ownerId !== req.user._id.toString()) {
          try {
            const notification = await Notification.create({
              recipient: ownerId,
              sender: req.user._id,
              type: "TASK_SUBMITTED_FOR_REVIEW",
              message: `${req.user.name || "Developer"} has submitted task "${task.title}" for review`,
              task: task._id,
              project: taskProjectId
            });
            emitNotification(ownerId, notification);
          } catch (notifErr) {
            console.warn("Failed to notify project owner:", notifErr.message);
          }
        }
      } else if (task.status === "Approved") {
        // Send notification to developer
        const devId = task.assignedTo?._id
          ? task.assignedTo._id.toString()
          : task.assignedTo
          ? task.assignedTo.toString()
          : null;

        if (devId && devId !== req.user._id.toString()) {
          try {
            const notification = await Notification.create({
              recipient: devId,
              sender: req.user._id,
              type: "TASK_APPROVED",
              message: "Your task has been approved by company.",
              task: task._id,
              project: taskProjectId
            });
            emitNotification(devId, notification);
          } catch (notifErr) {
            console.warn("Failed to notify developer of task approval:", notifErr.message);
          }
        }
      } else if (task.status === "Completed") {
        // 1. Send notification to developer
        const devId = task.assignedTo?._id
          ? task.assignedTo._id.toString()
          : task.assignedTo
          ? task.assignedTo.toString()
          : null;

        if (devId && devId !== req.user._id.toString()) {
          try {
            const devNotification = await Notification.create({
              recipient: devId,
              sender: req.user._id,
              type: "TASK_COMPLETED",
              message: "Your task has been completed.",
              task: task._id,
              project: taskProjectId
            });
            emitNotification(devId, devNotification);
          } catch (notifErr) {
            console.warn("Failed to notify developer of task completion:", notifErr.message);
          }
        }

        // 2. Store completion notification for company
        try {
          const compNotification = await Notification.create({
            recipient: req.user._id,
            sender: req.user._id,
            type: "TASK_COMPLETED",
            message: "Task marked completed successfully.",
            task: task._id,
            project: taskProjectId
          });
          emitNotification(req.user._id, compNotification);
        } catch (notifErr) {
          console.warn("Failed to store company completion notification:", notifErr.message);
        }
      } else if (task.status === "In Progress" && previousStatus === "Submitted For Review") {
        // Revisions requested by company
        const devId = task.assignedTo?._id
          ? task.assignedTo._id.toString()
          : task.assignedTo
          ? task.assignedTo.toString()
          : null;

        if (devId && devId !== req.user._id.toString()) {
          try {
            const notification = await Notification.create({
              recipient: devId,
              sender: req.user._id,
              type: "TASK_STATUS_CHANGED",
              message: `${req.user.companyName || req.user.name || "Company"} requested revisions on task "${task.title}".`,
              task: task._id,
              project: taskProjectId
            });
            emitNotification(devId, notification);
          } catch (notifErr) {
            console.warn("Failed to notify developer of revision request:", notifErr.message);
          }
        }
      }

      // Broadcast real-time task update to all connected clients
      emitTaskUpdated(task);
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
    const isCompany = req.user.role === "company";
    const isDeveloper = req.user.role === "developer";
    const isManager = req.user.role === "manager";
    const isCreator =
      task.createdBy &&
      (task.createdBy._id
        ? task.createdBy._id.toString()
        : task.createdBy.toString()) === req.user._id.toString();
    const isProjectOwner =
      task.project?.owner &&
      (task.project.owner._id
        ? task.project.owner._id.toString()
        : task.project.owner.toString()) === req.user._id.toString();

    // Developers cannot delete tasks
    if (isDeveloper) {
      return res.status(403).json({
        success: false,
        message: "Developers are not authorized to delete tasks"
      });
    }

    // Company cannot delete another company's task
    if (isCompany && !isProjectOwner && !isCreator) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete another company's task"
      });
    }

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
