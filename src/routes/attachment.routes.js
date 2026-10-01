import { Router } from "express";
import {
  uploadMiddleware,
  uploadAttachment,
  getAttachments,
  deleteAttachment
} from "../controllers/attachment.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// Protect all attachment routes with authentication middleware
router.use(protect);

// Task-level attachment routes: /api/v1/tasks/:taskId/attachments
router
  .route("/tasks/:taskId/attachments")
  .post(uploadMiddleware, uploadAttachment)
  .get(getAttachments);

// Singular alias: /api/v1/task/:taskId/attachments
router
  .route("/task/:taskId/attachments")
  .post(uploadMiddleware, uploadAttachment)
  .get(getAttachments);

// Delete attachment: /api/v1/tasks/:taskId/attachments/:attachmentId
router
  .route("/tasks/:taskId/attachments/:attachmentId")
  .delete(deleteAttachment);

// Singular alias: /api/v1/task/:taskId/attachments/:attachmentId
router
  .route("/task/:taskId/attachments/:attachmentId")
  .delete(deleteAttachment);

// Direct attachment delete alias: /api/v1/attachments/:attachmentId
router
  .route("/attachments/:attachmentId")
  .delete(deleteAttachment);

export default router;
