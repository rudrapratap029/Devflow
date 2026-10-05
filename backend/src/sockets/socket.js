import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io = null;

// Initialize Socket.IO with HTTP server
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
    }
  });

  // JWT Authentication middleware for Socket connections
  io.use((socket, next) => {
    try {
      let token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization;

      if (token && typeof token === "string") {
        const trimmed = token.trim();
        if (trimmed.toLowerCase().startsWith("bearer ")) {
          token = trimmed.slice(7).trim();
        } else {
          token = trimmed;
        }
        token = token.replace(/^["']|["']$/g, "").trim();
      }

      if (!token) {
        return next(new Error("Authentication error: Token required"));
      }

      const secret =
        process.env.ACCESS_TOKEN_SECRET ||
        process.env.JWT_SECRET ||
        "devflow_jwt_access_super_secret_key_minimum_32_chars_2026";

      const decoded = jwt.verify(token, secret);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      return next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  // Connection event: join user to personal room
  io.on("connection", (socket) => {
    const userRoom = `user_${socket.userId}`;
    socket.join(userRoom);

    socket.on("disconnect", () => {
      // Clean disconnect
    });
  });

  return io;
};

// Getter for io instance
export const getIO = () => {
  return io;
};

// Emit real-time notification to a specific user's room
export const emitNotification = (recipientId, notification) => {
  if (!io || !recipientId) return;

  const userRoom = `user_${recipientId.toString()}`;
  const payload = {
    _id: notification._id,
    type: notification.type,
    message: notification.message,
    task: notification.task?._id || notification.task || null,
    project: notification.project?._id || notification.project || null,
    sender: notification.sender?._id || notification.sender,
    isRead: notification.isRead ?? false,
    createdAt: notification.createdAt || new Date().toISOString()
  };

  io.to(userRoom).emit("notification:new", payload);
};
