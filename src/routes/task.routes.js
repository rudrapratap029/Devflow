import { Router } from "express";
import { getTasks } from "../controllers/task.controller.js";

const router = Router();

// Task routes (placeholders)
router.get("/", getTasks);

export default router;
