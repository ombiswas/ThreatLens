import { registerUser, loginUser } from "../services/authService.js";
import { logAuditEvent } from "../services/auditService.js";
import { AUDIT_ACTIONS } from "../utils/constants.js";

/**
 * Public registration endpoint.
 * Always assigns the Viewer role.
 */
export async function register(req, res) {
  const { name, email, password } = req.body;
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  const { user, token } = await registerUser({
    name,
    email,
    password,
    ip,
    userAgent
  });

  res.status(201).json({
    status: "success",
    data: {
      user,
      token
    }
  });
}

/**
 * Login endpoint.
 * Returns generic error message on failure to prevent user enumeration.
 */
export async function login(req, res) {
  const { email, password } = req.body;
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  const { user, token } = await loginUser({
    email,
    password,
    ip,
    userAgent
  });

  res.status(200).json({
    status: "success",
    data: {
      user,
      token
    }
  });
}

/**
 * Returns current authenticated user profile.
 */
export async function getMe(req, res) {
  res.status(200).json({
    status: "success",
    data: {
      user: req.user
    }
  });
}

/**
 * Logout endpoint.
 * In a stateless JWT architecture, the client discards the token.
 * An audit log entry is recorded for security monitoring.
 */
export async function logout(req, res) {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  if (req.user) {
    await logAuditEvent({
      userId: req.user._id,
      action: AUDIT_ACTIONS.LOGOUT,
      ip,
      userAgent,
      details: { email: req.user.email }
    });
  }

  res.status(200).json({
    status: "success",
    message: "Logged out successfully"
  });
}
