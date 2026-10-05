import { Router } from "express";
import {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  addMember,
  removeMember
} from "../controllers/workspace.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Protect all workspace routes with authentication middleware
router.use(protect);

// Workspace CRUD routes (Admin and Company can create, update, delete own workspaces)
router.route("/").post(authorize("admin", "company"), createWorkspace).get(getWorkspaces);
router.route("/:id")
  .get(getWorkspaceById)
  .put(authorize("admin", "company"), updateWorkspace)
  .delete(authorize("admin", "company"), deleteWorkspace);

// Member management routes (Admin and Workspace Owner Company)
router.post("/:id/members", authorize("admin", "company"), addMember);
router.delete("/:id/members/:userId", authorize("admin", "company"), removeMember);

export default router;
