import { apiClient } from "./apiClient";

export async function listNotificationsApi() {
  const res = await apiClient.get("/notifications");
  return res.data;
}

export async function unreadNotificationsCountApi() {
  const res = await apiClient.get("/notifications/unread-count");
  return res.data?.unreadCount || 0;
}

export async function markNotificationReadApi(id) {
  const res = await apiClient.patch(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsReadApi() {
  const res = await apiClient.patch("/notifications/read-all");
  return res.data;
}

export async function clearAllNotificationsApi() {
  const res = await apiClient.patch("/notifications/clear");
  return res.data;
}
