import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import {
  generateAccessToken,
  generateRefreshToken
} from "../utils/generateTokens.js";

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, avatar } = req.body || {};

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    // Check if user already exists
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // Validate role if provided
    const validRoles = ["admin", "manager", "developer"];
    const userRole = role && validRoles.includes(role.toLowerCase())
      ? role.toLowerCase()
      : "developer";

    // Create user (password hashing is handled in User pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: userRole,
      avatar: avatar || ""
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          isActive: user.isActive,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user with email & password
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    // Validate input fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    // Find user by email
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Verify account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Please contact support."
      });
    }

    // Compare passwords
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Generate Access and Refresh Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token securely in database
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token in secure HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Also set access token cookie for seamless browser/Postman support
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    return res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: {
        accessToken,
        refreshToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          isActive: user.isActive
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate a new access token using refresh token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
export const refreshTokenHandler = async (req, res, next) => {
  try {
    // Get refresh token from request body or cookie
    const token = req.body?.refreshToken || req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required"
      });
    }

    // Verify refresh token
    const refreshSecret =
      process.env.REFRESH_TOKEN_SECRET ||
      process.env.JWT_REFRESH_SECRET ||
      "devflow_jwt_refresh_super_secret_key_minimum_32_chars_2026";

    let decoded;
    try {
      decoded = jwt.verify(token, refreshSecret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token"
      });
    }

    // Find user and verify stored refresh token matches
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token or token has been revoked"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated"
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user);

    // Update accessToken cookie
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully",
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user & invalidate refresh token
// @route   POST /api/v1/auth/logout
// @access  Public (or Authenticated)
export const logout = async (req, res, next) => {
  try {
    const token = req.body?.refreshToken || req.cookies?.refreshToken;

    // Invalidate refresh token in database
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    } else if (token) {
      await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: null });
    }

    // Clear HTTP-only cookies
    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production"
    });

    res.clearCookie("accessToken", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production"
    });

    return res.status(200).json({
      success: true,
      message: "User logged out successfully",
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get currently logged in user profile
// @route   GET /api/v1/auth/me
// @access  Private (Requires JWT)
export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(error);
  }
};
