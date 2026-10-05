import { Router } from "express";
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectSummary,
  submitProject,
  reviewProjectWithAI,
  respondToProject
} from "../controllers/project.controller.js";
import { getProjectActivityLogs } from "../controllers/activity.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Protect all project routes
router.use(protect);

// Project summary route (Admin, Manager, and Company)
router.post("/:projectId/summary", authorize("admin", "manager", "company"), getProjectSummary);

// Developer project response route (Accept, Reject, Pending, In Progress)
router.post("/:projectId/respond", respondToProject);

// Project submission route (Developer, Member, Owner, Admin)
router.post("/:projectId/submit", submitProject);

// AI Project Analysis / Review route (Company, Admin, Manager)
router.post("/:projectId/ai-review", authorize("admin", "manager", "company"), reviewProjectWithAI);

// Project CRUD routes (Admin, Manager, and Company can create and delete projects)
router.route("/").post(authorize("admin", "manager", "company"), createProject).get(getProjects);
router.route("/:projectId")
  .get(getProjectById)
  .put(updateProject)
  .delete(authorize("admin", "manager", "company"), deleteProject);

// Project member management routes (Admin, Manager, and Company owner)
router.post("/:projectId/members", authorize("admin", "manager", "company"), addProjectMember);
router.delete("/:projectId/members/:userId", authorize("admin", "manager", "company"), removeProjectMember);

// Activity logs route
router.get("/:projectId/activity", getProjectActivityLogs);

export default router;
