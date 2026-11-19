import { api } from "./api.js";

/**
 * Fetch notifications and unread count.
 */
export async function fetchNotifications() {
  const data = await api.get("/api/notifications");
  return data;
}

/**
 * Mark a notification as read.
 * @param {string} id
 */
export async function markNotificationRead(id) {
  const data = await api.patch(`/api/notifications/${id}/read`);
  return data;
}

/**
 * Mark all notifications as read for current user.
 */
export async function markAllNotificationsRead() {
  const data = await api.patch("/api/notifications/read-all");
  return data;
}
