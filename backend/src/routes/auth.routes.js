import { Router } from "express";
import {
  register,
  login,
  logout,
  refreshTokenHandler,
  getMe
} from "../controllers/auth.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Health/Status check for auth route
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "auth route working",
    data: {}
  });
});

// Public Authentication Routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshTokenHandler);
router.post("/logout", logout);

// Protected Authentication Routes (Requires valid JWT)
router.get("/me", protect, getMe);

// Example Role-Based Protected Route (Requires Admin role)
router.get("/admin-only", protect, authorize("admin"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Admin access granted. You are authorized.",
    data: {
      user: req.user
    }
  });
});

export default router;
