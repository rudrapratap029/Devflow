import "dotenv/config";
import http from "http";
import app from "./app.js";

import connectDB from "./config/db.js";
import { initSocket } from "./socket/socket.js";

await connectDB();

const PORT = process.env.PORT || 5000;

// Create HTTP server for Express and Socket.IO
const httpServer = http.createServer(app);

// Initialize Socket.IO
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 DevFlow server is running on port ${PORT}`);
});