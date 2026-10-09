import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import User from "../models/user.model.js";
import Task from "../models/task.model.js";
import Workspace from "../models/workspace.model.js";
import Project from "../models/project.model.js";
import Notification from "../models/notification.model.js";
import ActivityLog from "../models/activityLog.model.js";
import { emitNotification } from "../socket/socket.js";

// Uploads directory setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage for user profile pictures
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

// Allowed profile image formats: JPG, JPEG, PNG
const allowedExtensions = [".jpg", ".jpeg", ".png"];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPG, JPEG, and PNG images are allowed."),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter
});

// Accept fields 'profilePicture', 'avatar', or 'file'
const uploadFields = upload.fields([
  { name: "profilePicture", maxCount: 1 },
  { name: "avatar", maxCount: 1 },
  { name: "file", maxCount: 1 }
]);

// Wrapper middleware to provide beginner-friendly error messages
export const uploadProfilePictureMiddleware = (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File size exceeds the 5 MB limit"
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Image upload failed"
      });
    }

    if (req.files) {
      req.file =
        req.files.profilePicture?.[0] ||
        req.files.avatar?.[0] ||
        req.files.file?.[0];
    }

    next();
  });
};

// @desc    Upload or update logged-in user's profile picture
// @route   PUT /api/v1/users/profile-picture or PUT /api/v1/users/avatar
// @access  Private (Logged-in user)
export const updateProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image file to upload (JPG, JPEG, or PNG)"
      });
    }

    // Relative web-accessible path
    const relativePath = `/uploads/${req.file.filename}`;

    // Find current user to delete old uploaded profile picture from disk
    const currentUser = await User.findById(req.user._id);
    if (currentUser) {
      const oldPic = currentUser.profilePicture || currentUser.avatar;
      if (oldPic && oldPic.startsWith("/uploads/profile-")) {
        const oldFilePath = path.join(uploadDir, path.basename(oldPic));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    // Update both profilePicture and avatar in database
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        profilePicture: relativePath,
        avatar: relativePath
      },
      { returnDocument: "after" }
    ).select("-password -refreshToken");

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      data: {
        profilePicture: updatedUser.profilePicture,
        avatar: updatedUser.avatar,
        user: updatedUser
      }
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Update logged-in user profile (name, profile picture, bio, skills)
// @route   PUT /api/v1/users/profile
// @access  Private (Logged-in user)
export const updateProfile = async (req, res, next) => {
  try {
    const { name, bio, skills } = req.body || {};
    const updateData = {};

    // 1. Update Name if provided
    if (typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }

    // 2. Update Bio if provided (max 500 characters, trimmed)
    if (bio !== undefined) {
      updateData.bio = typeof bio === "string" ? bio.trim().slice(0, 500) : "";
    }

    // 3. Update Profile Picture if file is uploaded
    if (req.file) {
      const relativePath = `/uploads/${req.file.filename}`;

      // Delete old photo from disk if it was an uploaded file
      const currentUser = await User.findById(req.user._id);
      if (currentUser) {
        const oldPic = currentUser.profilePicture || currentUser.avatar;
        if (oldPic && oldPic.startsWith("/uploads/profile-")) {
          const oldFilePath = path.join(uploadDir, path.basename(oldPic));
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
      }

      updateData.profilePicture = relativePath;
      updateData.avatar = relativePath;
    }

    // 4. Update Skills if provided
    if (skills !== undefined) {
      let rawSkills = [];
      if (Array.isArray(skills)) {
        rawSkills = skills;
      } else if (typeof skills === "string") {
        try {
          const parsed = JSON.parse(skills);
          if (Array.isArray(parsed)) {
            rawSkills = parsed;
          } else {
            rawSkills = skills.split(",");
          }
        } catch {
          rawSkills = skills.split(",");
        }
      }

      // Simple validation:
      // - No empty skill
      // - No duplicate skills (case-insensitive deduplication)
      // - Trim extra spaces
      const cleanSkills = [];
      const seen = new Set();
      for (const item of rawSkills) {
        if (typeof item === "string") {
          const trimmed = item.trim();
          if (trimmed.length > 0) {
            const lower = trimmed.toLowerCase();
            if (!seen.has(lower)) {
              seen.add(lower);
              cleanSkills.push(trimmed);
            }
          }
        }
      }

      updateData.skills = cleanSkills;
    }

    // 5. Update Company Profile specific fields
    const {
      location,
      companySize,
      foundedYear,
      hiringStatus,
      github,
      linkedin,
      portfolio,
      companyName,
      companyWebsite,
      companyDescription,
      industry,
      companyLogo
    } = req.body || {};

    if (typeof location === "string") updateData.location = location.trim();
    if (typeof companySize === "string") updateData.companySize = companySize.trim();
    if (typeof foundedYear === "string") updateData.foundedYear = foundedYear.trim();
    if (typeof hiringStatus === "string") updateData.hiringStatus = hiringStatus.trim();
    if (typeof github === "string") updateData.github = github.trim();
    if (typeof linkedin === "string") updateData.linkedin = linkedin.trim();
    if (typeof portfolio === "string") updateData.portfolio = portfolio.trim();
    if (typeof companyName === "string" && companyName.trim()) updateData.companyName = companyName.trim();
    if (typeof companyWebsite === "string") updateData.companyWebsite = companyWebsite.trim();
    if (typeof companyDescription === "string") updateData.companyDescription = companyDescription.trim();
    if (typeof industry === "string") updateData.industry = industry.trim();
    if (typeof companyLogo === "string") updateData.companyLogo = companyLogo.trim();

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { returnDocument: "after", runValidators: true }
    ).select("-password -refreshToken");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const pic = updatedUser.profilePicture || updatedUser.avatar || "";
    const userObj = updatedUser.toObject ? updatedUser.toObject() : { ...updatedUser };

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          ...userObj,
          profilePicture: pic,
          avatar: pic,
          bio: updatedUser.bio || "",
          skills: updatedUser.skills || []
        }
      }
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Get currently logged-in user's profile picture
// @route   GET /api/v1/users/profile-picture or GET /api/v1/users/avatar
// @access  Private (Logged-in user)
export const getProfilePicture = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("name email avatar profilePicture role");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const picture = user.profilePicture || user.avatar || "";

    return res.status(200).json({
      success: true,
      message: "Profile picture fetched successfully",
      data: {
        profilePicture: picture,
        avatar: picture,
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove logged-in user's profile picture
// @route   DELETE /api/v1/users/profile-picture or DELETE /api/v1/users/avatar
// @access  Private (Logged-in user)
export const deleteProfilePicture = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const oldPic = user.profilePicture || user.avatar;
    if (oldPic && oldPic.startsWith("/uploads/profile-")) {
      const oldFilePath = path.join(uploadDir, path.basename(oldPic));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        profilePicture: "",
        avatar: ""
      },
      { returnDocument: "after" }
    ).select("-password -refreshToken");

    return res.status(200).json({
      success: true,
      message: "Profile picture removed successfully",
      data: {
        profilePicture: "",
        avatar: "",
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registered users with optional search and task summary
// @route   GET /api/v1/users
// @access  Private (All authenticated users)
export const getUsers = async (req, res, next) => {
  try {
    const { search } = req.query;
    const filter = {};

    // Support optional search by name, email, skills, or bio
    if (search && search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { skills: searchRegex },
        { bio: searchRegex }
      ];
    }

    // Fetch users and task statistics in parallel using existing relationships
    const [users, taskStatsAggregation] = await Promise.all([
      User.find(filter)
        .select("-password -refreshToken")
        .sort({ createdAt: -1 }),
      Task.aggregate([
        {
          $group: {
            _id: {
              assignedTo: "$assignedTo",
              isCompleted: { $eq: ["$status", "Done"] }
            },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Build map of task statistics by user ID
    const statsMap = {};
    for (const item of taskStatsAggregation) {
      if (item._id && item._id.assignedTo) {
        const uId = item._id.assignedTo.toString();
        if (!statsMap[uId]) {
          statsMap[uId] = { total: 0, completed: 0, pending: 0 };
        }
        statsMap[uId].total += item.count;
        if (item._id.isCompleted) {
          statsMap[uId].completed += item.count;
        } else {
          statsMap[uId].pending += item.count;
        }
      }
    }

    const formattedUsers = users.map((u) => {
      const pic = u.profilePicture || u.avatar || "";
      const userObj = u.toObject ? u.toObject() : { ...u };
      const stats = statsMap[u._id.toString()] || { total: 0, completed: 0, pending: 0 };
      return {
        ...userObj,
        profilePicture: pic,
        avatar: pic,
        bio: u.bio || "",
        skills: u.skills || [],
        pendingTasks: stats.pending,
        completedTasks: stats.completed,
        taskStats: stats
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedUsers.length,
      data: formattedUsers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user profile by ID with bio, skills, task stats, workspaces, and projects
// @route   GET /api/v1/users/:id
// @access  Private (All authenticated users)
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const user = await User.findById(id).select("-password -refreshToken");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const userId = user._id;

    // Fetch user's task stats, workspaces, and projects in parallel
    const [totalTasks, completedTasks, pendingTasks, inProgressTasks, workspaces, projects, recentActivities] =
      await Promise.all([
        Task.countDocuments({ assignedTo: userId }),
        Task.countDocuments({
          assignedTo: userId,
          status: { $in: ["Done", "Completed", "Approved"] }
        }),
        Task.countDocuments({
          assignedTo: userId,
          status: { $in: ["Todo", "In Progress", "Submitted For Review"] }
        }),
        Task.countDocuments({ assignedTo: userId, status: "In Progress" }),
        Workspace.find({
          $or: [{ owner: userId }, { members: userId }]
        }).select("name description"),
        Project.find({
          $or: [{ owner: userId }, { members: userId }]
        })
          .select("name description status workspace developerResponses owner")
          .populate("workspace", "name"),
        ActivityLog.find({ user: userId })
          .populate("project", "name")
          .populate("task", "title")
          .sort({ createdAt: -1 })
          .limit(6)
      ]);

    // Calculate company specific metrics
    let companyStats = null;
    if (user.role === "company") {
      const ownedProjects = projects.filter((p) => p.owner?.toString() === userId.toString() || p._id);
      const openProjects = ownedProjects.filter((p) => p.status === "Active").length;
      const completedProjCount = ownedProjects.filter((p) => p.status === "Completed").length;

      const activeDevSet = new Set();
      ownedProjects.forEach((p) => {
        if (Array.isArray(p.developerResponses)) {
          p.developerResponses.forEach((r) => {
            if (r.status === "Accepted" && r.developer) {
              activeDevSet.add(r.developer.toString());
            }
          });
        }
      });

      companyStats = {
        openProjects,
        completedProjects: completedProjCount,
        activeDevelopers: activeDevSet.size
      };
    }

    const pic = user.profilePicture || user.avatar || "";
    const userObj = user.toObject ? user.toObject() : { ...user };

    const userPayload = {
      ...userObj,
      profilePicture: pic,
      avatar: pic,
      bio: user.bio || "",
      skills: user.skills || [],
      taskStats: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        current: inProgressTasks,
        inProgress: inProgressTasks
      },
      companyStats: companyStats || {
        openProjects: 0,
        completedProjects: 0,
        activeDevelopers: 0
      },
      recentActivities: recentActivities || [],
      workspaces: workspaces || [],
      projects: projects || []
    };

    return res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      data: {
        ...userPayload,
        user: userPayload
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get specific user's profile picture by ID
// @route   GET /api/v1/users/:id/profile-picture or GET /api/v1/users/:id/avatar
// @access  Private (All authenticated users)
export const getUserProfilePictureById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const user = await User.findById(id).select("name email avatar profilePicture role");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const pic = user.profilePicture || user.avatar || "";

    return res.status(200).json({
      success: true,
      message: "Profile picture fetched successfully",
      data: {
        profilePicture: pic,
        avatar: pic,
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify or reject a company account (Admin only)
// @route   PATCH /api/v1/users/:id/verify-company
// @access  Private (Admin only)
export const verifyCompanyStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status || !["Approved", "Rejected", "Pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'Approved', 'Rejected', or 'Pending'"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.role !== "company") {
      return res.status(400).json({
        success: false,
        message: "Only company accounts can be verified or rejected"
      });
    }

    user.verificationStatus = status;
    await user.save();

    // Send notification to company
    try {
      const notif = await Notification.create({
        recipient: user._id,
        sender: req.user._id,
        type: "COMPANY_VERIFIED",
        message: `Your company verification status has been updated to: ${status}`,
        task: null,
        project: null
      });
      emitNotification(user._id, notif);
    } catch (notifErr) {
      console.warn("Failed to emit company verification notification:", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Company account status successfully updated to ${status}`,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyName: user.companyName,
          verificationStatus: user.verificationStatus
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
