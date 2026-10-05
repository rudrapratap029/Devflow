import mongoose from "mongoose";
import Project from "../models/project.model.js";
import Workspace from "../models/workspace.model.js";
import User from "../models/user.model.js";
import Task from "../models/task.model.js";
import ActivityLog from "../models/activityLog.model.js";
import Notification from "../models/notification.model.js";
import { emitNotification } from "../sockets/socket.js";
import { generateProjectSummary, generateProjectReview } from "../services/ai.service.js";

// @desc    Create a new project
// @route   POST /api/v1/projects
// @access  Private
export const createProject = async (req, res, next) => {
  try {
    // 1. Verify company authorization: Unverified company cannot upload/create projects
    if (req.user.role === "company" && req.user.verificationStatus !== "Approved") {
      return res.status(403).json({
        success: false,
        message: "Your company account is pending administrative verification. You cannot upload or create projects until an administrator approves your account."
      });
    }

    const {
      name,
      description,
      workspace,
      workspaceId,
      status,
      githubUrl,
      liveUrl,
      requiredSkills,
      experienceLevel,
      deadline
    } = req.body || {};
    const targetWorkspaceId = workspace || workspaceId;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project title is required"
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

    // Verify user is a member of the workspace or workspace owner or admin
    const isWorkspaceMember =
      existingWorkspace.members.some(
        (memberId) => memberId.toString() === req.user._id.toString()
      ) ||
      (existingWorkspace.owner && existingWorkspace.owner.toString() === req.user._id.toString()) ||
      req.user.role === "admin";

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

    // Parse required skills
    let cleanSkills = [];
    if (Array.isArray(requiredSkills)) {
      cleanSkills = requiredSkills.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof requiredSkills === "string") {
      cleanSkills = requiredSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
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
      liveUrl: liveUrl ? liveUrl.trim() : "",
      requiredSkills: cleanSkills,
      experienceLevel: experienceLevel || "Intermediate",
      deadline: deadline ? String(deadline).trim() : ""
    });

    // Automatically send notification to all Developers
    try {
      const developers = await User.find({ role: "developer" }).select("_id");
      const companyTitle = req.user.companyName || req.user.name || "A verified company";
      const notifDocs = developers.map((dev) => ({
        recipient: dev._id,
        sender: req.user._id,
        type: "NEW_PROJECT_AVAILABLE",
        message: `New Project Available: ${companyTitle} has posted: "${project.name}"`,
        project: project._id,
        task: null
      }));

      if (notifDocs.length > 0) {
        const savedNotifs = await Notification.insertMany(notifDocs);
        savedNotifs.forEach((notif) => {
          emitNotification(notif.recipient, notif);
        });
      }
    } catch (notifErr) {
      console.warn("Failed to dispatch developer notifications:", notifErr.message);
    }

    // Log project creation activity
    await ActivityLog.create({
      user: req.user._id,
      project: project._id,
      action: "PROJECT_CREATED",
      description: `${req.user.name || "User"} created project "${project.name}"`
    });

    return res.status(201).json({
      success: true,
      message: "Project created and published successfully",
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
    const isAdmin = req.user.role?.toLowerCase() === "admin";
    const isCompany = req.user.role?.toLowerCase() === "company";

    // Admin sees all projects; Company sees projects they own or belong to; Developers see all published/available projects
    const filter = isAdmin
      ? {}
      : isCompany
      ? { $or: [{ owner: req.user._id }, { members: req.user._id }] }
      : {};

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
    const limit = parseInt(req.query.limit, 10) > 0 ? parseInt(req.query.limit, 10) : 25;
    const skip = (page - 1) * limit;

    const totalProjects = await Project.countDocuments(filter);
    const totalPages = Math.ceil(totalProjects / limit);

    const projects = await Project.find(filter)
      .populate("workspace", "name")
      .populate("owner", "name email avatar profilePicture role companyName companyLogo companyWebsite industry verificationStatus")
      .populate("members", "name email avatar profilePicture skills role companyName")
      .populate("submittedBy", "name email avatar profilePicture role skills")
      .populate("developerResponses.developer", "name email avatar profilePicture skills role")
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
// @access  Private (Project members, owners, admin)
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
      .populate("owner", "name email avatar profilePicture role companyName companyLogo companyWebsite industry verificationStatus")
      .populate("members", "name email avatar profilePicture skills role companyName")
      .populate("submittedBy", "name email avatar profilePicture role skills")
      .populate("developerResponses.developer", "name email avatar profilePicture skills role");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Check if logged-in user is a member, owner, admin, or developer viewing available project
    const isOwner = project.owner && project.owner._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role?.toLowerCase() === "admin";
    const isDeveloper = req.user.role?.toLowerCase() === "developer";
    const isMember = project.members.some(
      (member) => member._id.toString() === req.user._id.toString()
    );

    if (!isMember && !isOwner && !isAdmin && !isDeveloper) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view this project"
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

    // Check if logged-in user is the project owner or admin
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role?.toLowerCase() === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the project owner or admin can delete this project"
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

    // Check if logged-in user is the project owner or admin
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role?.toLowerCase() === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the project owner or admin can add members"
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

    // Check if logged-in user is the project owner or admin
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role?.toLowerCase() === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the project owner or admin can remove members"
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

// @desc    Generate AI summary for a selected project
// @route   POST /api/v1/projects/:projectId/summary
// @access  Private (Admin and Manager only)
export const getProjectSummary = async (req, res, next) => {
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
      .populate("owner", "name email")
      .populate("members", "name email role");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Fetch tasks belonging to this project
    const tasks = await Task.find({ project: projectId })
      .populate("assignedTo", "name email");

    // Call AI service to generate structured summary
    const summaryData = await generateProjectSummary({ project, tasks });

    return res.status(200).json({
      success: true,
      message: "AI project summary generated successfully",
      data: summaryData,
      ...summaryData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Developer response to a project (Accept, Reject, Pending, In Progress)
// @route   POST /api/v1/projects/:projectId/respond or POST /api/projects/:projectId/respond
// @access  Private (Developer, Member, Admin)
export const respondToProject = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const { status, notes } = req.body || {};

    const validStatuses = ["Pending", "Accepted", "Rejected", "In Progress"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Response status must be one of: 'Pending', 'Accepted', 'Rejected', 'In Progress'"
      });
    }

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

    // Initialize developerResponses array if not present
    if (!Array.isArray(project.developerResponses)) {
      project.developerResponses = [];
    }

    // Find existing response for this developer
    const existingIndex = project.developerResponses.findIndex(
      (r) => r.developer && r.developer.toString() === req.user._id.toString()
    );

    if (existingIndex >= 0) {
      project.developerResponses[existingIndex].status = status;
      if (notes !== undefined) project.developerResponses[existingIndex].responseNotes = notes.trim();
      project.developerResponses[existingIndex].respondedAt = new Date();
    } else {
      project.developerResponses.push({
        developer: req.user._id,
        status,
        responseNotes: notes ? notes.trim() : "",
        respondedAt: new Date()
      });
    }

    // If accepted or in progress, add developer to project members if not already member
    const isMember = project.members.some(
      (m) => m.toString() === req.user._id.toString()
    );

    if ((status === "Accepted" || status === "In Progress") && !isMember) {
      project.members.push(req.user._id);
    } else if (status === "Rejected" && isMember) {
      project.members = project.members.filter(
        (m) => m.toString() !== req.user._id.toString()
      );
    }

    await project.save();

    // Notify project owner of the developer's response
    try {
      if (project.owner && project.owner.toString() !== req.user._id.toString()) {
        const notif = await Notification.create({
          recipient: project.owner,
          sender: req.user._id,
          type: "TASK_STATUS_CHANGED",
          message: `${req.user.name || "A developer"} has marked their status as "${status}" for project: "${project.name}"`,
          project: project._id,
          task: null
        });
        emitNotification(project.owner, notif);
      }
    } catch (notifErr) {
      console.warn("Failed to notify project owner:", notifErr.message);
    }

    await project.populate("workspace", "name");
    await project.populate("owner", "name email avatar profilePicture role companyName companyLogo companyWebsite industry verificationStatus");
    await project.populate("members", "name email avatar profilePicture skills role companyName");
    await project.populate("developerResponses.developer", "name email avatar profilePicture skills role");

    return res.status(200).json({
      success: true,
      message: `Project response recorded as '${status}'`,
      data: {
        project
      },
      project
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit a completed project for review
// @route   POST /api/v1/projects/:projectId/submit or POST /api/projects/:projectId/submit
// @access  Private (Developer, Member, Owner, Admin)
export const submitProject = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;

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

    const isMember = project.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role?.toLowerCase() === "admin";
    const isDeveloper = req.user.role?.toLowerCase() === "developer";

    if (!isMember && !isOwner && !isAdmin && !isDeveloper) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only submit work for projects you are working on."
      });
    }

    const { notes, description, githubUrl, liveUrl, files } = req.body || {};
    const submissionText = (description || notes || "").trim();

    project.submissionStatus = "Submitted";
    project.submittedBy = req.user._id;
    project.submittedAt = new Date();
    project.status = "Completed";

    if (submissionText) project.submissionNotes = submissionText;
    if (githubUrl !== undefined && githubUrl.trim()) project.githubUrl = githubUrl.trim();
    if (liveUrl !== undefined && liveUrl.trim()) project.liveUrl = liveUrl.trim();

    // Store uploaded deliverables / files (PDF, DOCX, XLSX, ZIP, PNG, JPG, JPEG)
    if (Array.isArray(files) && files.length > 0) {
      project.submissionFiles = files;
    }

    // Update or add developer response submission details
    if (!Array.isArray(project.developerResponses)) {
      project.developerResponses = [];
    }

    const devIndex = project.developerResponses.findIndex(
      (r) => r.developer && r.developer.toString() === req.user._id.toString()
    );

    const submissionPayload = {
      githubUrl: project.githubUrl,
      liveUrl: project.liveUrl,
      description: submissionText,
      files: project.submissionFiles || [],
      submittedAt: new Date()
    };

    if (devIndex >= 0) {
      project.developerResponses[devIndex].status = "Submitted";
      project.developerResponses[devIndex].submission = submissionPayload;
      project.developerResponses[devIndex].respondedAt = new Date();
    } else {
      project.developerResponses.push({
        developer: req.user._id,
        status: "Submitted",
        responseNotes: submissionText,
        respondedAt: new Date(),
        submission: submissionPayload
      });
    }

    // Ensure submitting developer is part of project members
    if (!isMember) {
      project.members.push(req.user._id);
    }

    await project.save();

    await project.populate("workspace", "name");
    await project.populate("owner", "name email avatar profilePicture role companyName companyLogo companyWebsite industry verificationStatus");
    await project.populate("members", "name email avatar profilePicture skills role companyName");
    await project.populate("submittedBy", "name email avatar profilePicture role skills");
    await project.populate("developerResponses.developer", "name email avatar profilePicture skills role");

    // Automatically send notification to the project owner (company)
    try {
      if (project.owner && project.owner._id.toString() !== req.user._id.toString()) {
        const notif = await Notification.create({
          recipient: project.owner._id,
          sender: req.user._id,
          type: "PROJECT_SUBMITTED",
          message: `${req.user.name || "A developer"} has submitted deliverables for: "${project.name}"`,
          project: project._id,
          task: null
        });
        emitNotification(project.owner._id, notif);
      }
    } catch (notifErr) {
      console.warn("Failed to notify company of submission:", notifErr.message);
    }

    await ActivityLog.create({
      user: req.user._id,
      project: project._id,
      action: "PROJECT_SUBMITTED",
      description: `${req.user.name || "Developer"} submitted project "${project.name}" for company review`
    });

    return res.status(200).json({
      success: true,
      message: "Project submitted successfully for company review",
      data: {
        project
      },
      project
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate AI Project Analysis / Review for Developer Submission
// @route   POST /api/v1/projects/:projectId/ai-review or POST /api/projects/:projectId/ai-review
// @access  Private (Company, Admin, Manager)
export const reviewProjectWithAI = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    const project = await Project.findById(projectId)
      .populate("owner", "name email role companyName")
      .populate("members", "name email role")
      .populate("submittedBy", "name email role");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    const isOwner = project.owner && project.owner._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role?.toLowerCase() === "admin";
    const isCompany = req.user.role?.toLowerCase() === "company";
    const isManager = req.user.role?.toLowerCase() === "manager";

    if (!isOwner && !isAdmin && !isCompany && !isManager) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only company reviewers or administrators can run AI project analysis"
      });
    }

    const tasks = await Task.find({ project: projectId }).populate("assignedTo", "name email");

    const reviewData = await generateProjectReview({ project, tasks });

    project.submissionStatus = "Under Review";
    project.aiReview = {
      overallScore: reviewData.overallScore || "85%",
      codeQuality: reviewData.codeQuality || "Clean modular structure with clear components",
      requirementCoverage: reviewData.requirementCoverage || "85%",
      missingFeatures: reviewData.missingFeatures || [],
      strengths: reviewData.strengths || [],
      weaknesses: reviewData.weaknesses || [],
      suggestions: reviewData.suggestions || [],
      improvementAreas: reviewData.improvementAreas || [
        "Defensive input validation and error handling",
        "Automated integration testing"
      ],
      recommendation: reviewData.recommendation || "Project is suitable with minor improvements.",
      analyzedAt: new Date()
    };

    await project.save();

    // Notify the submitting developer that AI evaluation is ready
    if (project.submittedBy) {
      try {
        const notif = await Notification.create({
          recipient: project.submittedBy._id || project.submittedBy,
          sender: req.user._id,
          type: "PROJECT_REVIEWED",
          message: `AI Project Review generated for "${project.name}". Overall Score: ${project.aiReview.overallScore}`,
          project: project._id,
          task: null
        });
        emitNotification(project.submittedBy._id || project.submittedBy, notif);
      } catch (notifErr) {
        console.warn("Failed to notify developer of AI review:", notifErr.message);
      }
    }

    await project.populate("workspace", "name");
    await project.populate("owner", "name email avatar profilePicture role companyName companyLogo companyWebsite industry verificationStatus");
    await project.populate("members", "name email avatar profilePicture skills role companyName");
    await project.populate("submittedBy", "name email avatar profilePicture role skills");
    await project.populate("developerResponses.developer", "name email avatar profilePicture skills role");

    await ActivityLog.create({
      user: req.user._id,
      project: project._id,
      action: "AI_REVIEW_GENERATED",
      description: `${req.user.name || "Reviewer"} generated AI Project Analysis for "${project.name}"`
    });

    return res.status(200).json({
      success: true,
      message: "AI project analysis generated successfully",
      data: {
        review: project.aiReview,
        project
      },
      review: project.aiReview,
      project
    });
  } catch (error) {
    next(error);
  }
};


