import bcrypt from "bcrypt";
import { User } from "../models/User.js";
import { ROLES, AUDIT_ACTIONS } from "../utils/constants.js";
import { signToken } from "../utils/jwt.js";
import { logAuditEvent } from "./auditService.js";
import { AppError, AuthError, ValidationError } from "../errors/AppError.js";

const BCRYPT_SALT_ROUNDS = 12;
// Pre-computed bcrypt cost 12 dummy hash to equalize timing on non-existent users
const DUMMY_BCRYPT_HASH = "$2b$12$y6rL0wM3O4U5v6W7X8Y9Zu0123456789012345678901234567890.";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Validates password strength according to organizational security policy:
 * - At least 10 characters
 * - Contains uppercase letter
 * - Contains lowercase letter
 * - Contains digit
 * - Contains special symbol
 * - Not identical to email address
 *
 * @param {string} password - Candidate password
 * @param {string} email - User email address
 * @throws {ValidationError} If password does not satisfy criteria
 */
export function validatePasswordPolicy(password, email = "") {
  if (!password || typeof password !== "string") {
    throw new ValidationError("Password is required");
  }

  if (password.length < 10) {
    throw new ValidationError("Password must be at least 10 characters in length");
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasNumber || !hasSymbol) {
    throw new ValidationError(
      "Password must include uppercase, lowercase, numeric, and symbol characters"
    );
  }

  if (email && password.toLowerCase() === email.toLowerCase().trim()) {
    throw new ValidationError("Password cannot be identical to your email address");
  }
}

/**
 * Registers a new user. Public registration creates the Viewer role exclusively.
 *
 * @param {object} params
 * @param {string} params.name
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} [params.ip]
 * @param {string} [params.userAgent]
 * @returns {Promise<{ user: User, token: string }>}
 */
export async function registerUser({
  name,
  email,
  password,
  ip = "unknown",
  userAgent = "unknown"
}) {
  const normalizedEmail = (email || "").toLowerCase().trim();

  validatePasswordPolicy(password, normalizedEmail);

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError("An account with this email already exists", 409, "USER_EXISTS");
  }

  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: ROLES.VIEWER,
    isActive: true
  });

  await logAuditEvent({
    userId: user._id,
    action: AUDIT_ACTIONS.REGISTER,
    ip,
    userAgent,
    details: { email: user.email, role: user.role }
  });

  const token = signToken({
    sub: user._id.toString(),
    role: user.role
  });

  return { user, token };
}

/**
 * Authenticates user credentials with constant-time timing resistance and automatic lockout.
 *
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} [params.ip]
 * @param {string} [params.userAgent]
 * @returns {Promise<{ user: User, token: string }>}
 */
export async function loginUser({ email, password, ip = "unknown", userAgent = "unknown" }) {
  const normalizedEmail = (email || "").toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");

  // Constant-time defense: run dummy hash comparison if user not found to avoid user enumeration
  if (!user) {
    await bcrypt.compare(password || "", DUMMY_BCRYPT_HASH);
    await logAuditEvent({
      userId: null,
      action: AUDIT_ACTIONS.LOGIN_FAILURE,
      ip,
      userAgent,
      details: { email: normalizedEmail, reason: "user_not_found" }
    });
    throw new AuthError("Invalid credentials");
  }

  // Check account lockout
  if (user.isLocked()) {
    await logAuditEvent({
      userId: user._id,
      action: AUDIT_ACTIONS.LOGIN_FAILURE,
      ip,
      userAgent,
      details: { email: normalizedEmail, reason: "account_locked", lockUntil: user.lockUntil }
    });
    throw new AuthError(
      "Account is temporarily locked due to too many failed attempts. Try again later."
    );
  }

  // Check if account has been deactivated
  if (!user.isActive) {
    await logAuditEvent({
      userId: user._id,
      action: AUDIT_ACTIONS.LOGIN_FAILURE,
      ip,
      userAgent,
      details: { email: normalizedEmail, reason: "account_inactive" }
    });
    throw new AuthError("Account has been deactivated. Please contact an administrator.");
  }

  const isPasswordValid = await user.comparePassword(password || "");

  if (!isPasswordValid) {
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    }

    await user.save();

    await logAuditEvent({
      userId: user._id,
      action: AUDIT_ACTIONS.LOGIN_FAILURE,
      ip,
      userAgent,
      details: {
        email: normalizedEmail,
        failedAttempts: user.failedLoginAttempts,
        isLockedNow: user.isLocked()
      }
    });

    throw new AuthError("Invalid credentials");
  }

  // Successful login: reset failed counters and update lastLoginAt
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  await logAuditEvent({
    userId: user._id,
    action: AUDIT_ACTIONS.LOGIN_SUCCESS,
    ip,
    userAgent,
    details: { email: normalizedEmail }
  });

  const token = signToken({
    sub: user._id.toString(),
    role: user.role
  });

  return { user, token };
}
