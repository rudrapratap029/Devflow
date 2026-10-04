import { createContext, useContext, useState, useEffect } from "react";
import API from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Clear state and localStorage helper
  const clearAuth = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
  };

  // Login handler: sets state and stores in localStorage
  const login = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("accessToken", token);
  };

  // Logout handler: calls backend logout, clears localStorage and state
  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } catch {
      // Ignore network errors during logout
    } finally {
      clearAuth();
    }
  };

  // Initialize auth state from localStorage and verify with backend
  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("accessToken");

      if (storedUser && storedToken) {
        try {
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);

          // Verify token validity by calling /auth/me
          try {
            const res = await API.get("/auth/me");
            if (res.data?.success && res.data?.data?.user) {
              setUser(res.data.data.user);
              localStorage.setItem("user", JSON.stringify(res.data.data.user));
            }
          } catch (err) {
            // Token expired or invalid
            if (err.response?.status === 401) {
              clearAuth();
            }
          }
        } catch {
          clearAuth();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Update user in state and localStorage
  const updateUser = (updatedData) => {
    setUser((prev) => {
      if (!prev) return prev;
      const nextUser = { ...prev, ...updatedData };
      localStorage.setItem("user", JSON.stringify(nextUser));
      return nextUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to consume AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
