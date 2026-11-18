import { Buffer } from "node:buffer";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AuthError } from "../errors/AppError.js";

const JWT_ALGORITHM = "HS256";

/**
 * Signs a JWT with pinned HS256 algorithm and restrictive payload (sub, role only).
 *
 * @param {object} payload
 * @param {string} payload.sub - User ID subject claim
 * @param {string} payload.role - User role claim
 * @param {object} [options]
 * @returns {string} Signed JWT string
 */
export function signToken({ sub, role }, options = {}) {
  if (!sub || !role) {
    throw new Error("JWT token payload must include sub and role");
  }

  return jwt.sign({ sub, role }, env.JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN || "30m",
    ...options
  });
}

/**
 * Verifies a JWT token with pinned HS256 algorithm.
 * Rejects alg: none, tampered signatures, and expired tokens.
 *
 * @param {string} token - Raw JWT token
 * @returns {object} Decoded payload with sub and role
 * @throws {AuthError}
 */
export function verifyToken(token) {
  if (!token || typeof token !== "string") {
    throw new AuthError("Authentication token is required");
  }

  // Pre-check: Reject unsecured tokens explicitly before library verification
  const parts = token.split(".");
  if (parts.length === 3) {
    try {
      const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
      if (!header.alg || header.alg.toLowerCase() === "none" || header.alg !== JWT_ALGORITHM) {
        throw new AuthError("Invalid token algorithm");
      }
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError("Malformed authentication token");
    }
  }

  try {
    return jwt.verify(token, env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM]
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AuthError("Authentication token has expired");
    }
    throw new AuthError("Invalid or tampered authentication token");
  }
}
