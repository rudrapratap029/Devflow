import axios from "axios";

// Create Axios instance with base URL from environment
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  headers: {
    "Content-Type": "application/json"
  }
});

// Prepare for JWT token usage: attach token from localStorage if present
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper to resolve profile picture / avatar URLs correctly across frontend and backend
export const getAvatarUrl = (avatar) => {
  if (!avatar) return "";
  if (
    avatar.startsWith("http://") ||
    avatar.startsWith("https://") ||
    avatar.startsWith("data:") ||
    avatar.startsWith("blob:")
  ) {
    return avatar;
  }
  const backendBase = (
    import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
  ).replace(/\/api\/v1\/?$/, "");
  const normalized = avatar.startsWith("/") ? avatar : `/${avatar}`;
  return `${backendBase}${normalized}`;
};

export default API;
