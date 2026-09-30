import mongoose from "mongoose";
import Comment from "../models/comment.model.js";
import Task from "../models/task.model.js";

// @desc    Create a comment on a task
// @route   POST /api/v1/tasks/:taskId/comments
// @access  Private
export const createComment = async (req, res, next) => {
  try {
    const taskId = req.params.taskId || req.params.id;
    const { text } = req.body || {};

    // Validate comment text
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required"
      });
    }

    // Validate task ID
    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID"
      });
    }

    // Check if task exists and populate project details for access check
    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Check project access: user must be project owner or member
    const project = task.project;
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Associated project not found"
      });
    }

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

    // Create comment with logged-in user as author
    const comment = await Comment.create({
      text: text.trim(),
      task: taskId,
      user: req.user._id
    });

    // Populate user info for response
    await comment.populate("user", "name email avatar");

    return res.status(201).json({
      success: true,
      message: "Comment created successfully",
      data: {
        comment
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all comments for a task
// @route   GET /api/v1/tasks/:taskId/comments
// @access  Private
export const getCommentsByTaskId = async (req, res, next) => {
  try {
    const taskId = req.params.taskId || req.params.id;

    // Validate task ID
    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID"
      });
    }

    // Check if task exists and populate project
    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Check project access: user must be project owner or member
    const project = task.project;
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Associated project not found"
      });
    }

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

    // Fetch comments sorted chronologically with author details
    const comments = await Comment.find({ task: taskId })
      .populate("user", "name email avatar")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      message: "Comments fetched successfully",
      data: {
        comments
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a comment
// @route   PUT /api/v1/comments/:commentId
// @access  Private (Comment owner only)
export const updateComment = async (req, res, next) => {
  try {
    const commentId = req.params.commentId || req.params.id;
    const { text } = req.body || {};

    // Validate comment ID
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID"
      });
    }

    // Validate comment text
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required"
      });
    }

    // Find comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    // Authorization: only comment owner can update
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update your own comment"
      });
    }

    // Update comment text
    comment.text = text.trim();
    await comment.save();

    // Populate user info for response
    await comment.populate("user", "name email avatar");

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      data: {
        comment
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a comment
// @route   DELETE /api/v1/comments/:commentId
// @access  Private (Comment owner only)
export const deleteComment = async (req, res, next) => {
  try {
    const commentId = req.params.commentId || req.params.id;

    // Validate comment ID
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID"
      });
    }

    // Find comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    // Authorization: only comment owner can delete
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete your own comment"
      });
    }

    // Delete comment from database
    await Comment.findByIdAndDelete(commentId);

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
