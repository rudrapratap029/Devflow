import { Router } from "express";
import { getProjects } from "../controllers/project.controller.js";

const router = Router();

// Project routes (placeholders)
router.get("/", getProjects);

export default router;
