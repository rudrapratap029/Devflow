import jwt from "jsonwebtoken";

// Generate short-lived Access Token (used for authorizing requests)
export const generateAccessToken = (user) => {
  const secret =
    process.env.ACCESS_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    "devflow_jwt_access_super_secret_key_minimum_32_chars_2026";

  return jwt.sign(
    { id: user._id, role: user.role },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  );
};

// Generate long-lived Refresh Token (used to obtain new access tokens)
export const generateRefreshToken = (user) => {
  const refreshSecret =
    process.env.REFRESH_TOKEN_SECRET ||
    process.env.JWT_REFRESH_SECRET ||
    "devflow_jwt_refresh_super_secret_key_minimum_32_chars_2026";

  return jwt.sign(
    { id: user._id },
    refreshSecret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );
};
