import User from "../models/user.model.js";

// @desc    Get all registered users with optional search
// @route   GET /api/v1/users
// @access  Private (Admin only)
export const getUsers = async (req, res, next) => {
  try {
    const { search } = req.query;
    const filter = {};

    // Support optional search by name or email
    if (search && search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex }
      ];
    }

    // Return newest registered users first and exclude sensitive fields
    const users = await User.find(filter)
      .select("-password -refreshToken")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};
