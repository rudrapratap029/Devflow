import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import apiRoutes from "./routes/index.js";
import notFound from "./middleware/notFound.middleware.js";
import errorHandler from "./middleware/error.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../uploads");

const app = express();

// Security headers
app.use(helmet());

// Enable CORS
app.use(cors());

// HTTP request logger
app.use(morgan("dev"));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Serve static uploads (allow cross-origin for frontend image display)
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(uploadDir)
);

// Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "DevFlow API Running",
    data: {}
  });
});

// Mount API v1 Routes
app.use("/api/v1", apiRoutes);
app.use("/api", apiRoutes);

// 404 Route Not Found Middleware
app.use(notFound);

// Global Error Handling Middleware
app.use(errorHandler);

export default app;