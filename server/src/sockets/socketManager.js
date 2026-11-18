import { Server as SocketIOServer } from "socket.io";
import { verifyToken } from "../utils/jwt.js";
import { User } from "../models/User.js";
import { ROLES } from "../utils/constants.js";
import { maskIp } from "../utils/ipMask.js";
import { logger } from "../utils/logger.js";

/**
 * Initializes and mounts Socket.IO server with JWT authentication and room-based telemetry.
 *
 * @param {import("node:http").Server} httpServer
 * @param {string} clientUrl - Allowed CORS origin
 * @returns {SocketIOServer}
 */
export function initSocketServer(httpServer, clientUrl) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: clientUrl,
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["websocket", "polling"]
  });

  // Authentication Middleware for Handshake
  io.use(async (socket, next) => {
    try {
      let rawToken = socket.handshake.auth?.token;

      if (!rawToken && socket.handshake.headers?.authorization) {
        const parts = socket.handshake.headers.authorization.split(" ");
        if (parts.length === 2 && parts[0] === "Bearer") {
          rawToken = parts[1];
        }
      }

      if (!rawToken || typeof rawToken !== "string") {
        return next(new Error("Authentication error: Missing authentication token"));
      }

      // Verify JWT signature and expiration
      const decoded = verifyToken(rawToken);

      // Verify user in database
      const user = await User.findById(decoded.sub).select("+isActive +lockUntil +role");
      if (!user) {
        return next(new Error("Authentication error: User account not found"));
      }

      if (!user.isActive) {
        return next(new Error("Authentication error: User account is inactive"));
      }

      if (user.lockUntil && user.lockUntil > Date.now()) {
        return next(new Error("Authentication error: User account is currently locked"));
      }

      // Attach authenticated user to socket instance
      socket.user = {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      };

      next();
    } catch (err) {
      logger.warn({
        msg: "Socket.IO handshake authentication failed",
        error: err.message
      });
      next(new Error(`Authentication error: ${err.message}`));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    logger.info({
      msg: "Socket.IO client connected",
      socketId: socket.id,
      userId: user._id,
      role: user.role
    });

    // Join role-appropriate and user rooms
    socket.join(`role:${user.role}`);
    socket.join(`user:${user._id}`);
    socket.join("authenticated");

    // Clean disconnect handler
    socket.on("disconnect", (reason) => {
      logger.info({
        msg: "Socket.IO client disconnected",
        socketId: socket.id,
        userId: user._id,
        reason
      });
      socket.removeAllListeners();
    });
  });

  return io;
}

/**
 * Emits a newly detected incident over Socket.IO with role-based IP masking.
 * Admins receive real IP addresses; Analysts and Viewers receive masked IPs.
 *
 * @param {SocketIOServer} io
 * @param {object} incident - Incident document or object
 */
export function emitNewIncident(io, incident) {
  if (!io) return;

  const raw = incident.toObject ? incident.toObject() : { ...incident };

  // Prepare sanitized payload for non-admin viewers
  const maskedPayload = {
    ...raw,
    source: maskIp(raw.source),
    destination: maskIp(raw.destination)
  };

  // 1. Emit to Administrators (unmasked)
  io.to(`role:${ROLES.ADMIN}`).emit("incident:new", raw);

  // 2. Emit to Analysts & Viewers (masked)
  io.to(`role:${ROLES.ANALYST}`).emit("incident:new", maskedPayload);
  io.to(`role:${ROLES.VIEWER}`).emit("incident:new", maskedPayload);
}

/**
 * Emits replay progress updates to the active user's room and authenticated observers.
 *
 * @param {SocketIOServer} io
 * @param {object} progressData
 * @param {string} userId - User initiating the replay
 */
export function emitReplayProgress(io, progressData, userId) {
  if (!io) return;

  // Emit directly to the user who started the replay
  io.to(`user:${userId}`).emit("replay:progress", progressData);

  // Also broadcast to analysts and admins monitoring live SOC telemetry
  io.to(`role:${ROLES.ADMIN}`)
    .to(`role:${ROLES.ANALYST}`)
    .emit("replay:feed", {
      userId,
      ...progressData
    });
}

/**
 * Emits in-app alert notifications to target roles.
 *
 * @param {SocketIOServer} io
 * @param {object} notification
 */
export function emitNotification(io, notification) {
  if (!io) return;

  const raw = notification.toObject ? notification.toObject() : { ...notification };

  if (raw.targetUser) {
    io.to(`user:${raw.targetUser}`).emit("notification:new", raw);
    return;
  }

  const targetRoles = raw.targetRoles || [ROLES.ADMIN, ROLES.ANALYST];
  for (const role of targetRoles) {
    io.to(`role:${role}`).emit("notification:new", raw);
  }
}
