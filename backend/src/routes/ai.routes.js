import { Router } from "express";
import {
  generateTaskSuggestion,
  recommendUsers
} from "../controllers/ai.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// Protect all AI routes with authentication
router.use(protect);

// AI Assistant endpoints
router.post("/task-suggestion", generateTaskSuggestion);
router.post("/recommend-users", recommendUsers);

export default router;
