import "dotenv/config";
import http from "http";
import app from "./src/app.js";

import connectDB from "./src/config/db.js";
import { initSocket } from "./src/sockets/socket.js";

await connectDB();

const PORT = process.env.PORT || 5000;

// Create HTTP server for Express and Socket.IO
const httpServer = http.createServer(app);

// Initialize Socket.IO
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 DevFlow server is running on port ${PORT}`);
});