import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead
} from "../controllers/notification.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// Protect all notification routes with JWT authentication
router.use(protect);

// Routes
router.get("/", getNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

export default router;
