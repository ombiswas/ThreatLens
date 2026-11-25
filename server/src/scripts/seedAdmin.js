import bcrypt from "bcrypt";
import { env } from "../config/env.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { ROLES, AUDIT_ACTIONS } from "../utils/constants.js";
import { logAuditEvent } from "../services/auditService.js";
import { logger } from "../utils/logger.js";

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Seeds or updates the system administrator account.
 * Idempotent operation: creates if not present, updates if already exists.
 * Never outputs or logs the password.
 *
 * @param {object} [options]
 * @param {string} [options.email] - Admin email
 * @param {string} [options.password] - Admin plaintext password
 * @param {string} [options.name] - Admin display name
 * @returns {Promise<import("../models/User.js").User>}
 */
export async function seedAdmin(options = {}) {
  const email = (options.email || env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = options.password || env.ADMIN_PASSWORD;
  const name = (options.name || "System Administrator").trim();

  if (!email || !password) {
    throw new Error(
      "Admin email and password must be configured in environment (ADMIN_EMAIL, ADMIN_PASSWORD) or passed as options"
    );
  }

  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(password, salt);

  let user = await User.findOne({ email }).select("+passwordHash");

  if (!user) {
    user = await User.create({
      name,
      email,
      passwordHash,
      role: ROLES.ADMIN,
      isActive: true
    });
    logger.info({ msg: "Admin user created successfully", email });
    await logAuditEvent({
      userId: user._id,
      action: AUDIT_ACTIONS.REGISTER,
      ip: "127.0.0.1",
      userAgent: "cli-seed-admin",
      details: { email, role: ROLES.ADMIN, source: "seedAdmin" }
    });
  } else {
    user.name = name;
    user.role = ROLES.ADMIN;
    user.passwordHash = passwordHash;
    user.isActive = true;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
    logger.info({ msg: "Admin user updated successfully", email });
    await logAuditEvent({
      userId: user._id,
      action: AUDIT_ACTIONS.ROLE_CHANGE,
      ip: "127.0.0.1",
      userAgent: "cli-seed-admin",
      details: { email, role: ROLES.ADMIN, source: "seedAdmin" }
    });
  }

  return user;
}

// Execute directly if run as a script
if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  (async () => {
    try {
      await connectDB(env.MONGO_URI);
      await seedAdmin();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      logger.fatal({ msg: "Admin seeding failed", error: err.message });
      await disconnectDB().catch(() => {});
      process.exit(1);
    }
  })();
}
