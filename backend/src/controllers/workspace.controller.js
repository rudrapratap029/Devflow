import mongoose from "mongoose";
import Workspace from "../models/workspace.model.js";
import User from "../models/user.model.js";

// @desc    Create a new workspace
// @route   POST /api/v1/workspaces
// @access  Private
export const createWorkspace = async (req, res, next) => {
  try {
    // 1. Verify company authorization: Unverified company cannot create workspaces
    if (req.user.role === "company" && req.user.verificationStatus !== "Approved") {
      return res.status(403).json({
        success: false,
        message: "Your company account is pending administrative verification. You cannot create workspaces until an administrator approves your account."
      });
    }

    const { name, description } = req.body || {};

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Workspace name is required"
      });
    }

    // Owner is the logged-in user; automatically add owner to members array
    const workspace = await Workspace.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      owner: req.user._id,
      members: [req.user._id]
    });

    return res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      data: {
        workspace
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all workspaces for the logged-in user
// @route   GET /api/v1/workspaces
// @access  Private
export const getWorkspaces = async (req, res, next) => {
  try {
    const filter = req.user.role?.toLowerCase() === "admin" ? {} : { members: req.user._id };
    const workspaces = await Workspace.find(filter)
      .populate("owner", "name email avatar profilePicture")
      .populate("members", "name email avatar profilePicture")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Workspaces fetched successfully",
      data: {
        workspaces
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single workspace by ID
// @route   GET /api/v1/workspaces/:id
// @access  Private (Members only)
export const getWorkspaceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace ID"
      });
    }

    const workspace = await Workspace.findById(id)
      .populate("owner", "name email avatar profilePicture")
      .populate("members", "name email avatar profilePicture");

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found"
      });
    }

    // Check if logged-in user is a member of the workspace or admin
    const isMember = workspace.members.some(
      (member) => member._id.toString() === req.user._id.toString()
    );
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    if (!isMember && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this workspace"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Workspace fetched successfully",
      data: {
        workspace
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update workspace details (name, description only)
// @route   PUT /api/v1/workspaces/:id
// @access  Private (Owner only)
export const updateWorkspace = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace ID"
      });
    }

    const workspace = await Workspace.findById(id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found"
      });
    }

    // Check if logged-in user is the owner or admin
    const isOwner = workspace.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role?.toLowerCase() === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the workspace owner or admin can update this workspace"
      });
    }

    const { name, description } = req.body || {};

    // Allow updating only name and description
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Workspace name cannot be empty"
        });
      }
      workspace.name = name.trim();
    }

    if (description !== undefined) {
      workspace.description = description.trim();
    }

    await workspace.save();

    await workspace.populate("owner", "name email avatar profilePicture");
    await workspace.populate("members", "name email avatar profilePicture");

    return res.status(200).json({
      success: true,
      message: "Workspace updated successfully",
      data: {
        workspace
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete workspace
// @route   DELETE /api/v1/workspaces/:id
// @access  Private (Owner only)
export const deleteWorkspace = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace ID"
      });
    }

    const workspace = await Workspace.findById(id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found"
      });
    }

    // Check if logged-in user is the owner or admin
    const isOwner = workspace.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role?.toLowerCase() === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the workspace owner or admin can delete this workspace"
      });
    }

    await Workspace.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Workspace deleted successfully",
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a member to workspace
// @route   POST /api/v1/workspaces/:id/members
// @access  Private (Owner only)
export const addMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body || {};

    // Validate workspace ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace ID"
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

    const workspace = await Workspace.findById(id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found"
      });
    }

    // Check if logged-in user is the owner or admin
    const isOwner = workspace.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role?.toLowerCase() === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the workspace owner or admin can add members"
      });
    }

    // Check if target user exists in database
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Prevent duplicate members
    const isAlreadyMember = workspace.members.some(
      (memberId) => memberId.toString() === userId.toString()
    );

    if (isAlreadyMember) {
      return res.status(400).json({
        success: false,
        message: "User is already a member of this workspace"
      });
    }

    workspace.members.push(userId);
    await workspace.save();

    await workspace.populate("owner", "name email avatar profilePicture");
    await workspace.populate("members", "name email avatar profilePicture");

    return res.status(200).json({
      success: true,
      message: "Member added successfully",
      data: {
        workspace
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a member from workspace
// @route   DELETE /api/v1/workspaces/:id/members/:userId
// @access  Private (Owner only)
export const removeMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    // Validate workspace ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace ID"
      });
    }

    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const workspace = await Workspace.findById(id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found"
      });
    }

    // Check if logged-in user is the owner or admin
    const isOwner = workspace.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role?.toLowerCase() === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the workspace owner or admin can remove members"
      });
    }

    // Cannot remove workspace owner from members
    if (workspace.owner.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove the workspace owner from members"
      });
    }

    // Check if user is actually a member
    const isMember = workspace.members.some(
      (memberId) => memberId.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: "User is not a member of this workspace"
      });
    }

    // Remove user from members array
    workspace.members = workspace.members.filter(
      (memberId) => memberId.toString() !== userId.toString()
    );
    await workspace.save();

    await workspace.populate("owner", "name email avatar profilePicture");
    await workspace.populate("members", "name email avatar profilePicture");

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
      data: {
        workspace
      }
    });
  } catch (error) {
    next(error);
  }
};
