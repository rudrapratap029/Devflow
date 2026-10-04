import mongoose from "mongoose";
import ActivityLog from "../models/activityLog.model.js";
import Project from "../models/project.model.js";

// @desc    Get all activity logs for a project
// @route   GET /api/v1/projects/:projectId/activity
// @access  Private (Project members and owner only)
export const getProjectActivityLogs = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;

    // Validate project ID format
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Verify user has access to the project
    const isOwner = project.owner && project.owner.toString() === req.user._id.toString();
    const isMember = project.members && project.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have access to this project"
      });
    }

    // Fetch activities sorted with latest first and populated user details
    const activities = await ActivityLog.find({ project: projectId })
      .populate("user", "name email avatar profilePicture")
      .populate("task", "title")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Activity logs fetched successfully",
      data: {
        activities
      }
    });
  } catch (error) {
    next(error);
  }
};
