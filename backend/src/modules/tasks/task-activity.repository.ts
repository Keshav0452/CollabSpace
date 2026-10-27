import { pool } from "../../config/database.js";

export type TaskActivityAction =
  | "created"
  | "title_changed"
  | "description_changed"
  | "status_changed"
  | "priority_changed"
  | "assignee_changed"
  | "due_date_changed";

export interface TaskActivityRecord {
  id: string;
  taskId: string;
  actorId: string | null;
  action: TaskActivityAction;
  details: Record<string, unknown>;
  createdAt: Date;
}

export async function recordTaskActivity(
  taskId: string,
  actorId: string | null,
  action: TaskActivityAction,
  details: Record<string, unknown> = {},
): Promise<void> {
  await pool.query(
    `INSERT INTO public.task_activity
       (task_id, actor_id, action, details)
     VALUES ($1, $2, $3, $4)`,
    [taskId, actorId, action, JSON.stringify(details)],
  );
}

export async function listTaskActivity(
  workspaceId: string,
  taskId: string,
): Promise<TaskActivityRecord[]> {
  const result = await pool.query<TaskActivityRecord>(
    `SELECT
       a.id,
       a.task_id AS "taskId",
       a.actor_id AS "actorId",
       a.action,
       a.details,
       a.created_at AS "createdAt"
     FROM public.task_activity AS a
     INNER JOIN public.tasks AS t
       ON t.id = a.task_id
     WHERE t.workspace_id = $1
       AND t.id = $2
     ORDER BY a.created_at DESC, a.id DESC`,
    [workspaceId, taskId],
  );

  return result.rows;
}