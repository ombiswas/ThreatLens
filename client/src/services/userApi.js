import { api } from "./api.js";

/**
 * Fetch paginated user accounts (Admin only).
 * @param {object} params
 */
export async function fetchUsers(params = {}) {
  const data = await api.get("/api/users", { params });
  return data;
}

/**
 * Update user role (Admin only).
 * @param {string} id
 * @param {string} role - "admin" | "analyst" | "viewer"
 */
export async function updateUserRole(id, role) {
  const data = await api.patch(`/api/users/${id}/role`, { role });
  return data?.user || data;
}

/**
 * Update user active status (Admin only).
 * @param {string} id
 * @param {boolean} isActive
 */
export async function updateUserStatus(id, isActive) {
  const data = await api.patch(`/api/users/${id}/status`, { isActive });
  return data?.user || data;
}
