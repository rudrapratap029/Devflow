import { Router } from "express";
import authRoutes from "./auth.routes.js";
import workspaceRoutes from "./workspace.routes.js";
import projectRoutes from "./project.routes.js";
import taskRoutes from "./task.routes.js";
import commentRoutes from "./comment.routes.js";
import attachmentRoutes from "./attachment.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import notificationRoutes from "./notification.routes.js";

const router = Router();

// API v1 Base Route
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "DevFlow API v1 is running",
    data: {}
  });
});

// Register Sub-Routes under /api/v1
router.use("/auth", authRoutes);

router.use("/workspace", workspaceRoutes);
router.use("/workspaces", workspaceRoutes);

router.use("/project", projectRoutes);
router.use("/projects", projectRoutes);

// Register Comment Routes
router.use(commentRoutes);

// Register Attachment Routes
router.use(attachmentRoutes);

router.use("/task", taskRoutes);
router.use("/tasks", taskRoutes);

// Register Dashboard Routes
router.use("/dashboard", dashboardRoutes);

// Register Notification Routes
router.use("/notifications", notificationRoutes);
router.use("/notification", notificationRoutes);

export default router;
