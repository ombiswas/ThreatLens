import { verifyToken } from "../utils/jwt.js";
import { User } from "../models/User.js";
import { AuthError, ForbiddenError } from "../errors/AppError.js";

/**
 * Authentication middleware: verifies Bearer JWT token, loads user, rejects inactive or locked accounts.
 */
export async function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AuthError("Authentication token is required"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    const userId = decoded.sub || decoded.id;

    if (!userId) {
      return next(new AuthError("Invalid authentication token payload"));
    }

    const user = await User.findById(userId);

    if (!user) {
      return next(new AuthError("User account no longer exists"));
    }

    if (!user.isActive) {
      return next(
        new ForbiddenError("Account has been deactivated. Please contact an administrator.")
      );
    }

    if (user.isLocked()) {
      return next(new AuthError("Account is temporarily locked due to repeated failed logins."));
    }

    req.user = user;
    req.tokenPayload = decoded;
    next();
  } catch (error) {
    next(error);
  }
}

// Backward-compatible alias
export const requireAuth = authenticate;

/**
 * Authorization middleware: restricts route access to specified roles.
 *
 * @param {...string} roles - Permitted roles (case-insensitive: "admin", "analyst", "viewer")
 * @returns {Function} Express middleware function
 */
export function authorize(...roles) {
  const allowed = roles.map((r) => r.toLowerCase());

  return (req, _res, next) => {
    if (!req.user) {
      return next(new AuthError("Authentication required before authorization"));
    }

    const userRole = (req.user.role || "").toLowerCase();

    if (!allowed.includes(userRole)) {
      return next(
        new ForbiddenError(
          `Forbidden: Insufficient privileges. Required role: ${roles.join(" or ")}`
        )
      );
    }

    next();
  };
}

// Backward-compatible alias
export const requireRole = authorize;
