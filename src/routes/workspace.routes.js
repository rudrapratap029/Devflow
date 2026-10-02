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

// Workspace CRUD routes (Admin only for create, update, delete)
router.route("/").post(authorize("admin"), createWorkspace).get(getWorkspaces);
router.route("/:id")
  .get(getWorkspaceById)
  .put(authorize("admin"), updateWorkspace)
  .delete(authorize("admin"), deleteWorkspace);

// Member management routes (Admin only)
router.post("/:id/members", authorize("admin"), addMember);
router.delete("/:id/members/:userId", authorize("admin"), removeMember);

export default router;
