import { Router } from "express";
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask
} from "../controllers/task.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// Protect all task routes
router.use(protect);

// Task CRUD routes
router.route("/").post(createTask).get(getTasks);
router.route("/:taskId").get(getTaskById).put(updateTask).delete(deleteTask);

export default router;
