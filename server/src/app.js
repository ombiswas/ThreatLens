import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { nosqlSanitizer } from "./middlewares/validate.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { auditLogsRouter } from "./routes/auditLogs.js";
import { detectRouter } from "./routes/detect.js";
import { incidentsRouter } from "./routes/incidents.js";
import { datasetsRouter } from "./routes/datasets.js";
import replayRouter from "./routes/replay.js";
import statsRouter from "./routes/stats.js";
import evaluationRouter from "./routes/evaluation.js";
import notificationRouter from "./routes/notifications.js";
import docsRouter from "./routes/docs.js";

/**
 * Creates and configures the Express application instance.
 * Exported as an app factory for isolation in unit and integration testing.
 */
export function createApp() {
  const app = express();

  // 1. Security Headers (Helmet)
  app.use(helmet());

  // 2. Strict CORS Allowlist
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or matched CLIENT_URL
        if (!origin || origin === env.CLIENT_URL) {
          callback(null, true);
        } else {
          callback(new Error("CORS policy does not allow access from the specified Origin."));
        }
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: false
    })
  );

  // 3. Request Logging via Pino (redacts authorization headers and sensitive keys)
  if (env.NODE_ENV !== "test") {
    app.use(pinoHttp({ logger }));
  }

  // 4. Rate Limiting (Defense in depth)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 500 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests from this IP, please try again later."
      }
    }
  });
  app.use(limiter);

  // 5. Body Parsing with Strict 1MB Size Limit & Compression
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // 6. NoSQL Operator Injection Guard
  app.use(nosqlSanitizer);

  // 7. Route Mounting
  app.use("/api", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/audit-logs", auditLogsRouter);
  app.use("/api/v1/audit-logs", auditLogsRouter);
  app.use("/api/detect", detectRouter);
  app.use("/api/v1/detect", detectRouter);
  app.use("/api/incidents", incidentsRouter);
  app.use("/api/v1/incidents", incidentsRouter);
  app.use("/api/datasets", datasetsRouter);
  app.use("/api/v1/datasets", datasetsRouter);
  app.use("/api/replay", replayRouter);
  app.use("/api/v1/replay", replayRouter);
  app.use("/api/stats", statsRouter);
  app.use("/api/v1/stats", statsRouter);
  app.use("/api/evaluation", evaluationRouter);
  app.use("/api/v1/evaluation", evaluationRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/v1/notifications", notificationRouter);
  app.use("/api/docs", docsRouter);
  app.use("/api/v1/docs", docsRouter);

  // 8. 404 Undefined Route Handler & Central Error Handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
