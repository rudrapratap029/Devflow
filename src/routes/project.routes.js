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
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// Protect all project routes
router.use(protect);

// Project CRUD routes
router.route("/").post(createProject).get(getProjects);
router.route("/:projectId").get(getProjectById).put(updateProject).delete(deleteProject);

// Project member management routes
router.post("/:projectId/members", addProjectMember);
router.delete("/:projectId/members/:userId", removeProjectMember);

export default router;
