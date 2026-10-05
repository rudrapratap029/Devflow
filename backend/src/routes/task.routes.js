import { Router } from "express";
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask
} from "../controllers/task.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Protect all task routes
router.use(protect);

// Task CRUD routes (Admin, Manager, and Company owner)
router.route("/").post(authorize("admin", "manager", "company"), createTask).get(getTasks);
router.route("/:taskId")
  .get(getTaskById)
  .put(updateTask)
  .delete(authorize("admin", "manager", "company"), deleteTask);

export default router;
