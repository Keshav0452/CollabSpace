import { pool } from "../../config/database.js";
import type { ListNotificationsQuery } from "./notification.validation.js";

export type NotificationType =
  | "task_assigned"
  | "task_status_changed"
  | "task_commented";

export interface NotificationRecord {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  taskId: string | null;
  message: string;
  isRead: boolean;
  createdAt: Date;
  readAt: Date | null;
}

const notificationColumns = `
  id,
  recipient_id AS "recipientId",
  actor_id AS "actorId",
  type,
  task_id AS "taskId",
  message,
  is_read AS "isRead",
  created_at AS "createdAt",
  read_at AS "readAt"
`;

export async function listNotifications(
  recipientId: string,
  query: ListNotificationsQuery
): Promise<{
  notifications: NotificationRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { page, limit, unreadOnly } = query;
  const offset = (page - 1) * limit;

  const countResult = await pool.query<{ count: string }>(
    `
      SELECT COUNT(*) AS count
      FROM public.notifications
      WHERE recipient_id = $1
        AND ($2::boolean = FALSE OR is_read = FALSE)
    `,
    [recipientId, unreadOnly]
  );

  const total = Number(countResult.rows[0]?.count ?? 0);

  const notificationsResult = await pool.query<NotificationRecord>(
    `
      SELECT ${notificationColumns}
      FROM public.notifications
      WHERE recipient_id = $1
        AND ($2::boolean = FALSE OR is_read = FALSE)
      ORDER BY created_at DESC, id DESC
      LIMIT $3
      OFFSET $4
    `,
    [recipientId, unreadOnly, limit, offset]
  );

  return {
    notifications: notificationsResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function countUnreadNotifications(
  recipientId: string
): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `
      SELECT COUNT(*) AS count
      FROM public.notifications
      WHERE recipient_id = $1
        AND is_read = FALSE
    `,
    [recipientId]
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function markNotificationAsRead(
  recipientId: string,
  notificationId: string
): Promise<NotificationRecord | null> {
  const result = await pool.query<NotificationRecord>(
    `
      UPDATE public.notifications
      SET is_read = TRUE,
          read_at = NOW()
      WHERE id = $1
        AND recipient_id = $2
        AND is_read = FALSE
      RETURNING ${notificationColumns}
    `,
    [notificationId, recipientId]
  );

  return result.rows[0] ?? null;
}

export async function markAllNotificationsAsRead(
  recipientId: string
): Promise<number> {
  const result = await pool.query(
    `
      UPDATE public.notifications
      SET is_read = TRUE,
          read_at = NOW()
      WHERE recipient_id = $1
        AND is_read = FALSE
    `,
    [recipientId]
  );

  return result.rowCount ?? 0;
}

export interface CreateNotificationInput {
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  taskId: string | null;
  message: string;
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<NotificationRecord> {
  const result = await pool.query<NotificationRecord>(
    `
      INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        type,
        task_id,
        message
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${notificationColumns}
    `,
    [
      input.recipientId,
      input.actorId,
      input.type,
      input.taskId,
      input.message,
    ]
  );

  return result.rows[0]!;
}