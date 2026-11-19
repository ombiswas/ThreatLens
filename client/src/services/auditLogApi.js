import { api } from "./api.js";

/**
 * Fetch paginated audit log entries with filters (Admin only).
 * @param {object} params
 */
export async function fetchAuditLogs(params = {}) {
  const data = await api.get("/api/audit-logs", { params });
  return data;
}
