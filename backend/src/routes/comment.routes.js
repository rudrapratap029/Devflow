import { Router } from "express";
import {
  createComment,
  getCommentsByTaskId,
  updateComment,
  deleteComment
} from "../controllers/comment.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// Protect all comment routes with authentication middleware
router.use(protect);

// Task-level comment routes: /api/v1/tasks/:taskId/comments
router
  .route("/tasks/:taskId/comments")
  .post(createComment)
  .get(getCommentsByTaskId);

// Singular alias: /api/v1/task/:taskId/comments
router
  .route("/task/:taskId/comments")
  .post(createComment)
  .get(getCommentsByTaskId);

// Comment-level routes: /api/v1/comments/:commentId
router
  .route("/comments/:commentId")
  .put(updateComment)
  .delete(deleteComment);

// Singular alias: /api/v1/comment/:commentId
router
  .route("/comment/:commentId")
  .put(updateComment)
  .delete(deleteComment);

export default router;
