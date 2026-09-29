import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Middleware to protect routes: verifies JWT and attaches user to req.user
export const protect = async (req, res, next) => {
  try {
    let token = null;

    // 1. Extract token from Authorization header (case-insensitive "Bearer <token>" or raw token)
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (authHeader && typeof authHeader === "string") {
      const trimmed = authHeader.trim();
      if (trimmed.toLowerCase().startsWith("bearer ")) {
        // Extract string after "Bearer " and trim
        token = trimmed.slice(7).trim();
      } else {
        // If client sent token directly without "Bearer "
        token = trimmed;
      }
    } else if (req.cookies && req.cookies.accessToken) {
      // 2. Fallback to accessToken cookie if present
      token = req.cookies.accessToken;
    }

    // Strip accidental quotes if user pasted token with quotes
    if (token) {
      token = token.replace(/^["']|["']$/g, "").trim();
    }

    // If no token could be found, return 401 Unauthorized
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route. Please log in."
      });
    }

    // 3. Verify token with ACCESS_TOKEN_SECRET (or JWT_SECRET)
    const secret =
      process.env.ACCESS_TOKEN_SECRET ||
      process.env.JWT_SECRET ||
      "devflow_jwt_access_super_secret_key_minimum_32_chars_2026";

    const decoded = jwt.verify(token, secret);

    // 4. Fetch user from database excluding sensitive fields
    const user = await User.findById(decoded.id).select("-password -refreshToken");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Token is invalid."
      });
    }

    // 5. Verify account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is deactivated. Please contact support."
      });
    }

    // 6. Attach authenticated user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized. Invalid or expired token."
    });
  }
};

// Reusable role-based authorization middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user?.role || "guest"}' is not authorized to access this resource`
      });
    }
    next();
  };
};
