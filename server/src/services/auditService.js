import { AuditLog } from "../models/AuditLog.js";
import { maskIp } from "../utils/ipMask.js";
import { logger } from "../utils/logger.js";

/**
 * Records an entry in the system audit log.
 * Fails safely to prevent audit record persistence from blocking core flows.
 *
 * @param {object} params
 * @param {string|null} [params.userId] - Target or acting user ID
 * @param {string} params.action - Audit action enum
 * @param {string} params.ip - Client IP address
 * @param {string} [params.userAgent] - Client User-Agent string
 * @param {object} [params.details] - Arbitrary structured metadata
 * @returns {Promise<AuditLog|null>}
 */
export async function logAuditEvent({
  userId = null,
  action,
  ip,
  userAgent = "unknown",
  details = {}
}) {
  try {
    const entry = await AuditLog.create({
      userId,
      action,
      ip: ip || "unknown",
      userAgent: userAgent || "unknown",
      details,
      timestamp: new Date()
    });
    return entry;
  } catch (error) {
    logger.error({ msg: "Failed to persist audit log entry", error: error.message, action });
    return null;
  }
}

/**
 * Retrieves paginated audit logs with optional filters and IP masking for non-admin viewers.
 *
 * @param {object} query
 * @param {number} [query.page=1]
 * @param {number} [query.limit=20]
 * @param {string} [query.action]
 * @param {string} [query.userId]
 * @param {string} [query.startDate]
 * @param {string} [query.endDate]
 * @param {boolean} [query.maskIpForNonAdmin=false]
 * @returns {Promise<{ logs: Array<object>, pagination: object }>}
 */
export async function getAuditLogs({
  page = 1,
  limit = 20,
  action,
  userId,
  startDate,
  endDate,
  maskIpForNonAdmin = false
}) {
  const filter = {};

  if (action) {
    filter.action = action;
  }
  if (userId) {
    filter.userId = userId;
  }
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) {
      filter.timestamp.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.timestamp.$lte = new Date(endDate);
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, rawLogs] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limitNum).lean()
  ]);

  const logs = rawLogs.map((log) => {
    if (maskIpForNonAdmin) {
      return { ...log, ip: maskIp(log.ip) };
    }
    return log;
  });

  return {
    logs,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1
    }
  };
}
