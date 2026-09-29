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
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// Protect all workspace routes with authentication middleware
router.use(protect);

// Workspace CRUD routes
router.route("/").post(createWorkspace).get(getWorkspaces);
router.route("/:id").get(getWorkspaceById).put(updateWorkspace).delete(deleteWorkspace);

// Member management routes
router.post("/:id/members", addMember);
router.delete("/:id/members/:userId", removeMember);

export default router;
