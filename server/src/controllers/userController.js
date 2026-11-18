import { User } from "../models/User.js";
import { ROLES, AUDIT_ACTIONS } from "../utils/constants.js";
import { logAuditEvent } from "../services/auditService.js";
import { NotFoundError, ForbiddenError } from "../errors/AppError.js";

/**
 * Returns paginated list of registered users (Admin only).
 */
export async function getUsers(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [total, users] = await Promise.all([
    User.countDocuments(),
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit)
  ]);

  res.status(200).json({
    status: "success",
    data: {
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1
      }
    }
  });
}

/**
 * Updates a user's role (Admin only).
 * Enforces safeguards against self-demotion and demoting the last active administrator.
 */
export async function updateUserRole(req, res) {
  const targetUser = await User.findById(req.params.id);
  if (!targetUser) {
    throw new NotFoundError("User not found");
  }

  const requestedRole = req.body.role.toLowerCase();

  // Prevent self-demotion
  if (req.user._id.toString() === targetUser._id.toString() && requestedRole !== ROLES.ADMIN) {
    throw new ForbiddenError("Administrators cannot demote themselves");
  }

  // Prevent removing the last active administrator
  if (targetUser.role === ROLES.ADMIN && requestedRole !== ROLES.ADMIN) {
    const activeAdminCount = await User.countDocuments({ role: ROLES.ADMIN, isActive: true });
    if (activeAdminCount <= 1) {
      throw new ForbiddenError("Cannot demote the last active system administrator");
    }
  }

  const previousRole = targetUser.role;
  targetUser.role = requestedRole;
  await targetUser.save();

  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  await logAuditEvent({
    userId: targetUser._id,
    action: AUDIT_ACTIONS.ROLE_CHANGE,
    ip,
    userAgent,
    details: {
      targetEmail: targetUser.email,
      previousRole,
      newRole: requestedRole,
      performedBy: req.user._id
    }
  });

  res.status(200).json({
    status: "success",
    data: {
      user: targetUser
    }
  });
}

/**
 * Updates a user's active status (Admin only).
 * Enforces safeguards against disabling self and disabling the last active administrator.
 */
export async function updateUserStatus(req, res) {
  const targetUser = await User.findById(req.params.id);
  if (!targetUser) {
    throw new NotFoundError("User not found");
  }

  const requestedStatus = req.body.isActive;

  // Prevent self-deactivation
  if (req.user._id.toString() === targetUser._id.toString() && requestedStatus === false) {
    throw new ForbiddenError("Administrators cannot deactivate their own account");
  }

  // Prevent disabling the last active administrator
  if (targetUser.role === ROLES.ADMIN && requestedStatus === false) {
    const activeAdminCount = await User.countDocuments({ role: ROLES.ADMIN, isActive: true });
    if (activeAdminCount <= 1) {
      throw new ForbiddenError("Cannot deactivate the last active system administrator");
    }
  }

  const previousStatus = targetUser.isActive;
  targetUser.isActive = requestedStatus;
  await targetUser.save();

  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  await logAuditEvent({
    userId: targetUser._id,
    action: AUDIT_ACTIONS.STATUS_CHANGE,
    ip,
    userAgent,
    details: {
      targetEmail: targetUser.email,
      previousStatus,
      newStatus: requestedStatus,
      performedBy: req.user._id
    }
  });

  res.status(200).json({
    status: "success",
    data: {
      user: targetUser
    }
  });
}
