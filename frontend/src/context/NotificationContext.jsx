import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import API from "../services/api";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);

  // Fetch notifications from backend API
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await API.get("/notifications");
      if (res.data?.success) {
        const list = res.data.data.notifications || [];
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.isRead).length);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [isAuthenticated]);

  // Initial fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setToast(null);
    }
  }, [isAuthenticated, fetchNotifications]);

  // Socket.IO real-time connection
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!isAuthenticated || !token) return;

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, "")
        : "http://localhost:5000");

    const socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5
    });

    // Listen for new notification emitted by backend
    socket.on("notification:new", (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show real-time notification popup toast
      setToast({
        _id: newNotif._id || Date.now().toString(),
        message: newNotif.message || "New notification received",
        type: newNotif.type || "INFO"
      });

      // Dispatch global window event for components to react in real-time
      window.dispatchEvent(new CustomEvent("devflow:notification", { detail: newNotif }));
    });

    // Listen for realtime task status updates
    socket.on("task:updated", (taskData) => {
      window.dispatchEvent(new CustomEvent("devflow:task_updated", { detail: taskData }));
    });

    socket.on("connect_error", (err) => {
      console.warn("Socket connection note:", err.message);
    });

    // Periodic notification polling to ensure sync
    const pollInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      socket.disconnect();
    };
  }, [isAuthenticated, user, fetchNotifications]);

  // Dismiss real-time toast
  const dismissToast = () => {
    setToast(null);
  };

  // Mark single notification as read
  const markAsRead = async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await API.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toast,
        dismissToast,
        markAsRead,
        markAllAsRead,
        fetchNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};

export default NotificationContext;
