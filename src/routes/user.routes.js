import { Router } from "express";
import { getUsers } from "../controllers/user.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Protect all user management routes: Require valid JWT and Admin role
router.use(protect);
router.use(authorize("admin"));

// GET /api/v1/users - List all registered users with optional search
router.get("/", getUsers);

export default router;
