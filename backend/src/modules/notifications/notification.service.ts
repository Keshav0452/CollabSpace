import { AppError } from "../../utils/app-error.js";
import {
  countUnreadNotifications,
  createNotification,
  CreateNotificationInput,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./notification.repository.js";
import type { ListNotificationsQuery } from "./notification.validation.js";

export async function getNotifications(
  userId: string,
  query: ListNotificationsQuery
) {
  return listNotifications(userId, query);
}

export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  return countUnreadNotifications(userId);
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
) {
  const notification = await markNotificationAsRead(
    userId,
    notificationId
  );

  if (!notification) {
    throw new AppError(
      404,
      "Notification not found or already read"
    );
  }

  return notification;
}

export async function markAllNotificationsRead(
  userId: string
): Promise<{ updatedCount: number }> {
  const updatedCount = await markAllNotificationsAsRead(userId);

  return { updatedCount };
}


export async function createUserNotification(
  input: CreateNotificationInput
) {
  return createNotification(input);
}