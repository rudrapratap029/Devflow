import { Router } from "express";
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember
} from "../controllers/project.controller.js";
import { getProjectActivityLogs } from "../controllers/activity.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Protect all project routes
router.use(protect);

// Project CRUD routes (Admin and Manager only for create, update, delete)
router.route("/").post(authorize("admin", "manager"), createProject).get(getProjects);
router.route("/:projectId")
  .get(getProjectById)
  .put(authorize("admin", "manager"), updateProject)
  .delete(authorize("admin", "manager"), deleteProject);

// Project member management routes (Admin and Manager only)
router.post("/:projectId/members", authorize("admin", "manager"), addProjectMember);
router.delete("/:projectId/members/:userId", authorize("admin", "manager"), removeProjectMember);

// Activity logs route
router.get("/:projectId/activity", getProjectActivityLogs);

export default router;
