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

  // 8. 404 Undefined Route Handler & Central Error Handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
