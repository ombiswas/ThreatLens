import http from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { logger } from "./utils/logger.js";

async function startServer() {
  // Connect to Database
  await connectDB(env.MONGO_URI);

  const app = createApp();
  const server = http.createServer(app);

  // Attach Socket.IO
  const io = new SocketIOServer(server, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ["GET", "POST"]
    }
  });

  // Attach io instance to express app for access in controllers
  app.set("io", io);

  io.on("connection", (socket) => {
    logger.info({ msg: "Socket.IO client connected", socketId: socket.id });

    socket.on("disconnect", () => {
      logger.info({ msg: "Socket.IO client disconnected", socketId: socket.id });
    });
  });

  // Start HTTP listening
  server.listen(env.PORT, () => {
    logger.info({
      msg: "AI CyberShield API server online",
      port: env.PORT,
      environment: env.NODE_ENV
    });
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    logger.info({ msg: `Received ${signal}. Shutting down gracefully...` });

    io.close(() => {
      logger.info({ msg: "Socket.IO closed" });
    });

    server.close(async () => {
      logger.info({ msg: "HTTP server closed" });
      await disconnectDB();
      process.exit(0);
    });

    // Force exit if shutdown hangs over 10s
    setTimeout(() => {
      logger.fatal({ msg: "Forced shutdown due to timeout" });
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((err) => {
  logger.fatal({ msg: "Failed to start server", error: err.message });
  process.exit(1);
});
