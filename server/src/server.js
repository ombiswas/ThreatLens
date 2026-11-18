import http from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { initSocketServer } from "./sockets/socketManager.js";
import { stopAllReplays } from "./services/replayService.js";
import { logger } from "./utils/logger.js";

async function startServer() {
  // Connect to Database
  await connectDB(env.MONGO_URI);

  const app = createApp();
  const server = http.createServer(app);

  // Attach Authenticated Socket.IO Server
  const io = initSocketServer(server, env.CLIENT_URL);

  // Attach io instance to express app for access in controllers & services
  app.set("io", io);

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

    stopAllReplays();

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
