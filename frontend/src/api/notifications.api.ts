import { apiRequest } from "./client";

export interface AppNotification {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: string;
  taskId: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface PaginatedNotifications {
  notifications: AppNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getNotifications(
  limit = 20,
): Promise<PaginatedNotifications> {
  const response = await apiRequest<{
    success: true;
    data: PaginatedNotifications;
  }>(`/notifications?limit=${limit}`);

  return response.data;
}

export async function getUnreadCount(): Promise<number> {
  const response = await apiRequest<{
    success: true;
    data: { unreadCount: number };
  }>("/notifications/unread-count");

  return response.data.unreadCount;
}

export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  await apiRequest<unknown>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest<unknown>("/notifications/read-all", {
    method: "PATCH",
  });
}
