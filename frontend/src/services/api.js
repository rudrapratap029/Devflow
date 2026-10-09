import axios from "axios";

// Create Axios instance with base URL from environment
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  headers: {
    "Content-Type": "application/json"
  }
});

// Attach JWT token from localStorage if present and valid
API.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("token");
  if (token && token !== "undefined" && token !== "null") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: automatically refresh expired access token and retry request
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If request failed with 401 (Invalid/expired token) and has not been retried yet
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken && refreshToken !== "undefined" && refreshToken !== "null") {
        try {
          const res = await axios.post(
            `${API.defaults.baseURL}/auth/refresh-token`,
            { refreshToken },
            { headers: { "Content-Type": "application/json" } }
          );

          if (res.data?.success && res.data?.data?.accessToken) {
            const newAccessToken = res.data.data.accessToken;
            localStorage.setItem("accessToken", newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return API(originalRequest);
          }
        } catch {
          // Refresh token expired or invalid: clear storage
          localStorage.removeItem("user");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("token");
        }
      }
    }

    return Promise.reject(error);
  }
);

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
