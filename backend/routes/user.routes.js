import { Router } from "express";
import {
  getUsers,
  getUserById,
  getUserProfilePictureById,
  updateProfilePicture,
  getProfilePicture,
  deleteProfilePicture,
  uploadProfilePictureMiddleware,
  updateProfile,
  verifyCompanyStatus
} from "../controllers/user.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Protect all user routes: Require valid JWT authentication
router.use(protect);

// Current Logged-in User Profile Routes (Self)
router.put("/profile", uploadProfilePictureMiddleware, updateProfile);
router.get("/profile-picture", getProfilePicture);
router.get("/avatar", getProfilePicture);
router.put("/profile-picture", uploadProfilePictureMiddleware, updateProfilePicture);
router.put("/avatar", uploadProfilePictureMiddleware, updateProfilePicture);
router.delete("/profile-picture", deleteProfilePicture);
router.delete("/avatar", deleteProfilePicture);

// User Listing Route (Accessible to all authenticated users for collaboration, task assignment, etc.)
router.get("/", getUsers);

// Admin-only Company Verification Route
router.patch("/:id/verify-company", authorize("admin"), verifyCompanyStatus);

// Specific User Profile & Profile Picture Visibility Routes (Accessible to all authenticated users)
router.get("/:id", getUserById);
router.get("/:id/profile-picture", getUserProfilePictureById);
router.get("/:id/avatar", getUserProfilePictureById);

export default router;
