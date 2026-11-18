import { getAuditLogs } from "../services/auditService.js";
import { ROLES } from "../utils/constants.js";

/**
 * Returns paginated, filterable system audit logs.
 * Masks client IP address if viewer role is non-admin.
 */
export async function getAuditLogsController(req, res) {
  const { page, limit, action, userId, startDate, endDate } = req.query;
  const isNonAdmin = !req.user || req.user.role !== ROLES.ADMIN;

  const result = await getAuditLogs({
    page,
    limit,
    action,
    userId,
    startDate,
    endDate,
    maskIpForNonAdmin: isNonAdmin
  });

  res.status(200).json({
    status: "success",
    data: result
  });
}
