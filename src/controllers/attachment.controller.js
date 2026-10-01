import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Attachment from "../models/attachment.model.js";
import Task from "../models/task.model.js";

// Resolve local uploads directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `attachment-${uniqueSuffix}${ext}`);
  }
});

// Allowed file extensions
const allowedExtensions = [".pdf", ".docx", ".png", ".jpg", ".jpeg"];

// File filter validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error("Unsupported file type. Only PDF, DOCX, PNG, JPG, and JPEG are allowed."),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter
});

const uploadSingle = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "attachment", maxCount: 1 }
]);

// Multer error handling wrapper middleware
export const uploadMiddleware = (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File size exceeds the 5 MB limit"
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "File upload failed"
      });
    }

    if (req.files) {
      req.file = req.files.file?.[0] || req.files.attachment?.[0];
    }

    next();
  });
};

// @desc    Upload an attachment to a task
// @route   POST /api/v1/tasks/:taskId/attachments
// @access  Private
export const uploadAttachment = async (req, res, next) => {
  try {
    const taskId = req.params.taskId || req.params.id;

    // Validate Task ID format
    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: "Invalid task ID"
      });
    }

    // Validate that file was provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a file to upload"
      });
    }

    // Verify task exists
    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Check project access
    const project = task.project;
    const isOwner = project && project.owner && project.owner.toString() === req.user._id.toString();
    const isMember =
      project &&
      project.members &&
      project.members.some((m) => m.toString() === req.user._id.toString());
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    if (!isAdmin && !isOwner && !isMember) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have access to this project"
      });
    }

    // Safe relative file path (never expose server file system paths)
    const relativeFilePath = `/uploads/${req.file.filename}`;

    const attachment = await Attachment.create({
      task: taskId,
      uploadedBy: req.user._id,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: relativeFilePath,
      fileType: req.file.mimetype || path.extname(req.file.originalname).slice(1),
      fileSize: req.file.size
    });

    await attachment.populate("uploadedBy", "name email avatar");

    return res.status(201).json({
      success: true,
      message: "Attachment uploaded successfully",
      data: {
        attachment
      }
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Get all attachments for a task
// @route   GET /api/v1/tasks/:taskId/attachments
// @access  Private
export const getAttachments = async (req, res, next) => {
  try {
    const taskId = req.params.taskId || req.params.id;

    // Validate Task ID format
    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID"
      });
    }

    // Verify task exists
    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Check project access
    const project = task.project;
    const isOwner = project && project.owner && project.owner.toString() === req.user._id.toString();
    const isMember =
      project &&
      project.members &&
      project.members.some((m) => m.toString() === req.user._id.toString());
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    if (!isAdmin && !isOwner && !isMember) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have access to this project"
      });
    }

    const attachments = await Attachment.find({ task: taskId })
      .populate("uploadedBy", "name email avatar")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Attachments fetched successfully",
      data: {
        attachments
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an attachment
// @route   DELETE /api/v1/tasks/:taskId/attachments/:attachmentId
// @access  Private (Uploader or Admin only)
export const deleteAttachment = async (req, res, next) => {
  try {
    const { taskId, attachmentId: paramAttachmentId, id } = req.params;
    const attachmentId = paramAttachmentId || id;

    // Validate ID formats
    if (taskId && !mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID"
      });
    }

    if (!attachmentId || !mongoose.Types.ObjectId.isValid(attachmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attachment ID"
      });
    }

    // Verify task exists if taskId provided
    if (taskId) {
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found"
        });
      }
    }

    // Find attachment
    const query = { _id: attachmentId };
    if (taskId) {
      query.task = taskId;
    }

    const attachment = await Attachment.findOne(query);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found"
      });
    }

    // Authorization: Only uploader or Admin can delete
    const isUploader = attachment.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role?.toLowerCase() === "admin";

    if (!isUploader && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the uploader or an Admin can delete this attachment"
      });
    }

    // Delete file from local uploads folder
    const localFilePath = path.join(uploadDir, attachment.fileName);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    // Delete database record
    await Attachment.findByIdAndDelete(attachmentId);

    return res.status(200).json({
      success: true,
      message: "Attachment deleted successfully",
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
