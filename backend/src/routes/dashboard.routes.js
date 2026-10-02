import { Router } from "express";
import {
  getOverview,
  getTaskStatus,
  getTaskPriority,
  getRecentTasks,
  getRecentActivities,
  getMyTasks
} from "../controllers/dashboard.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// Protect all dashboard routes
router.use(protect);

// Dashboard Analytics routes
router.get("/overview", getOverview);
router.get("/task-status", getTaskStatus);
router.get("/task-priority", getTaskPriority);
router.get("/recent-tasks", getRecentTasks);
router.get("/recent-activities", getRecentActivities);
router.get("/my-tasks", getMyTasks);

export default router;
