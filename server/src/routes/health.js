import { Router } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";

export const healthRouter = Router();

/**
 * Public health probe: reports server status, uptime, and database connection state.
 * Contains no secrets or environment variables.
 */
healthRouter.get(
  "/health",
  asyncHandler(async (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatusMap = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting"
    };

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: dbStatusMap[dbState] || "unknown"
    });
  })
);

/**
 * Readiness probe: confirms database is reachable and ready to receive traffic.
 */
healthRouter.get(
  "/ready",
  asyncHandler(async (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isDbConnected) {
      return res.status(503).json({
        status: "unready",
        reason: "Database is not connected"
      });
    }

    res.status(200).json({
      status: "ready",
      database: "connected"
    });
  })
);
