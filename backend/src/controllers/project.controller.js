import mongoose from "mongoose";
import Project from "../models/project.model.js";
import Workspace from "../models/workspace.model.js";
import User from "../models/user.model.js";
import ActivityLog from "../models/activityLog.model.js";

// @desc    Create a new project
// @route   POST /api/v1/projects
// @access  Private
export const createProject = async (req, res, next) => {
  try {
    const { name, description, workspace, workspaceId, status, githubUrl, liveUrl } = req.body || {};
    const targetWorkspaceId = workspace || workspaceId;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project name is required"
      });
    }

    if (!targetWorkspaceId) {
      return res.status(400).json({
        success: false,
        message: "Workspace ID is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(targetWorkspaceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace ID"
      });
    }

    // Verify workspace exists
    const existingWorkspace = await Workspace.findById(targetWorkspaceId);
    if (!existingWorkspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found"
      });
    }

    // Verify user is a member of the workspace
    const isWorkspaceMember = existingWorkspace.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!isWorkspaceMember) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You must be a member of this workspace to create a project"
      });
    }

    // Validate status if provided
    let projectStatus = "Active";
    if (status) {
      if (!["Active", "Completed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be either 'Active' or 'Completed'"
        });
      }
      projectStatus = status;
    }

    // Create project: owner = logged in user, automatically add owner to members
    const project = await Project.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      workspace: targetWorkspaceId,
      owner: req.user._id,
      members: [req.user._id],
      status: projectStatus,
      githubUrl: githubUrl ? githubUrl.trim() : "",
      liveUrl: liveUrl ? liveUrl.trim() : ""
    });

    // Log project creation activity
    await ActivityLog.create({
      user: req.user._id,
      project: project._id,
      action: "PROJECT_CREATED",
      description: `${req.user.name || "User"} created project "${project.name}"`
    });

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: {
        project
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all projects for the logged-in user
// @route   GET /api/v1/projects
// @access  Private
export const getProjects = async (req, res, next) => {
  try {
    // Return only projects where the logged-in user is a member
    const filter = { members: req.user._id };

    // Support optional workspace filtering
    const workspaceFilter = req.query.workspace || req.query.workspaceId;
    if (workspaceFilter && mongoose.Types.ObjectId.isValid(workspaceFilter)) {
      filter.workspace = workspaceFilter;
    }

    // Optional search: name or description
    if (req.query.search && req.query.search.trim()) {
      const escapedSearch = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex }
      ];
    }

    // Pagination
    const page = parseInt(req.query.page, 10) > 0 ? parseInt(req.query.page, 10) : 1;
    const limit = parseInt(req.query.limit, 10) > 0 ? parseInt(req.query.limit, 10) : 10;
    const skip = (page - 1) * limit;

    const totalProjects = await Project.countDocuments(filter);
    const totalPages = Math.ceil(totalProjects / limit);

    const projects = await Project.find(filter)
      .populate("workspace", "name")
      .populate("owner", "name email avatar profilePicture")
      .populate("members", "name email avatar profilePicture skills")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: "Projects fetched successfully",
      data: {
        projects,
        pagination: {
          currentPage: page,
          totalPages,
          totalProjects
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project by ID
// @route   GET /api/v1/projects/:projectId
// @access  Private (Project members only)
export const getProjectById = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;

    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    const project = await Project.findById(projectId)
      .populate("workspace", "name")
      .populate("owner", "name email avatar profilePicture")
      .populate("members", "name email avatar profilePicture skills");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Check if logged-in user is a member of the project
    const isMember = project.members.some(
      (member) => member._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Project fetched successfully",
      data: {
        project
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project (name, description, status)
// @route   PUT /api/v1/projects/:projectId
// @access  Private (Owner only)
export const updateProject = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;

    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Check if logged-in user is project owner, admin, manager, or member
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role?.toLowerCase() === "admin";
    const isManager = req.user.role?.toLowerCase() === "manager";
    const isMember =
      project.members &&
      project.members.some((m) => m.toString() === req.user._id.toString());

    if (!isOwner && !isAdmin && !isManager && !isMember) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to update this project"
      });
    }

    const { name, description, status, githubUrl, liveUrl } = req.body || {};

    // Only owner, admin, or manager can rename or change the description of the project
    if (name !== undefined) {
      if (!isOwner && !isAdmin && !isManager) {
        return res.status(403).json({
          success: false,
          message: "Only the project owner, Manager, or Admin can rename this project"
        });
      }
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Project name cannot be empty"
        });
      }
      project.name = name.trim();
    }

    if (description !== undefined) {
      if (!isOwner && !isAdmin && !isManager) {
        return res.status(403).json({
          success: false,
          message: "Only the project owner, Manager, or Admin can update project description"
        });
      }
      project.description = description.trim();
    }

    if (status !== undefined) {
      if (!["Active", "Completed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be either 'Active' or 'Completed'"
        });
      }
      project.status = status;
    }

    if (githubUrl !== undefined) {
      project.githubUrl = githubUrl ? githubUrl.trim() : "";
    }

    if (liveUrl !== undefined) {
      project.liveUrl = liveUrl ? liveUrl.trim() : "";
    }

    await project.save();

    await project.populate("workspace", "name");
    await project.populate("owner", "name email avatar profilePicture");
    await project.populate("members", "name email avatar profilePicture skills");

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: {
        project
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/v1/projects/:projectId
// @access  Private (Owner only)
export const deleteProject = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;

    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Check if logged-in user is the project owner
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the project owner can delete this project"
      });
    }

    await Project.findByIdAndDelete(projectId);

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add member to project
// @route   POST /api/v1/projects/:projectId/members
// @access  Private (Owner only)
export const addProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const { userId } = req.body || {};

    // Validate project ID format
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    // Validate user ID
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Check if logged-in user is the project owner
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the project owner can add members"
      });
    }

    // Verify user exists in database
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Rule: User must already belong to the workspace
    const workspace = await Workspace.findById(project.workspace);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found"
      });
    }

    const belongsToWorkspace = workspace.members.some(
      (memberId) => memberId.toString() === userId.toString()
    );

    if (!belongsToWorkspace) {
      return res.status(400).json({
        success: false,
        message: "User must be a member of the workspace before being added to the project"
      });
    }

    // Rule: Prevent duplicate members
    const isAlreadyMember = project.members.some(
      (memberId) => memberId.toString() === userId.toString()
    );

    if (isAlreadyMember) {
      return res.status(400).json({
        success: false,
        message: "User is already a member of this project"
      });
    }

    project.members.push(userId);
    await project.save();

    await project.populate("workspace", "name");
    await project.populate("owner", "name email avatar profilePicture");
    await project.populate("members", "name email avatar profilePicture skills");

    return res.status(200).json({
      success: true,
      message: "Member added to project successfully",
      data: {
        project
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove member from project
// @route   DELETE /api/v1/projects/:projectId/members/:userId
// @access  Private (Owner only)
export const removeProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const { userId } = req.params;

    // Validate project ID format
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Check if logged-in user is the project owner
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the project owner can remove members"
      });
    }

    // Rule: Owner cannot remove themselves
    if (project.owner.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove project owner from members"
      });
    }

    // Check if user is currently a member
    const isMember = project.members.some(
      (memberId) => memberId.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: "User is not a member of this project"
      });
    }

    // Remove user from members array
    project.members = project.members.filter(
      (memberId) => memberId.toString() !== userId.toString()
    );
    await project.save();

    await project.populate("workspace", "name");
    await project.populate("owner", "name email avatar profilePicture");
    await project.populate("members", "name email avatar profilePicture skills");

    return res.status(200).json({
      success: true,
      message: "Member removed from project successfully",
      data: {
        project
      }
    });
  } catch (error) {
    next(error);
  }
};
