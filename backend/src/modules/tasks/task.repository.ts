import type { PoolClient } from "pg";
import { pool } from "../../config/database.js";
import type {
  CreateTaskInput,
  UpdateTaskInput,
  ListTasksQuery,
} from "./task.validation.js";

export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskRecord {
  id: string;
  workspaceId: string;
  projectId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  createdBy: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedTasks {
  tasks: TaskRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Assignees live in public.task_assignees and are aggregated into one array.
const taskColumns = `
  id,
  workspace_id AS "workspaceId",
  project_id AS "projectId",
  title,
  description,
  status,
  priority,
  COALESCE(
    (SELECT array_agg(ta.user_id::text ORDER BY ta.assigned_at, ta.user_id)
     FROM public.task_assignees AS ta
     WHERE ta.task_id = tasks.id),
    ARRAY[]::text[]
  ) AS "assigneeIds",
  created_by AS "createdBy",
  due_date AS "dueDate",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

type Queryable = Pick<PoolClient, "query">;

async function selectTask(
  client: Queryable,
  workspaceId: string,
  taskId: string,
): Promise<TaskRecord> {
  const result = await client.query<TaskRecord>(
    `SELECT ${taskColumns}
     FROM public.tasks
     WHERE workspace_id = $1 AND id = $2`,
    [workspaceId, taskId],
  );

  const task = result.rows[0];

  if (!task) {
    throw new Error("Task not found after write");
  }

  return task;
}

async function addAssignees(
  client: Queryable,
  workspaceId: string,
  taskId: string,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) {
    return;
  }

  await client.query(
    `INSERT INTO public.task_assignees (task_id, workspace_id, user_id)
     SELECT $1, $2, unnest($3::uuid[])
     ON CONFLICT DO NOTHING`,
    [taskId, workspaceId, userIds],
  );
}

// Notify each recipient (never the actor) that a task was assigned to them.
async function notifyAssigned(
  client: Queryable,
  task: { id: string; title: string },
  workspaceId: string,
  actorId: string,
  recipientIds: string[],
): Promise<void> {
  for (const recipientId of recipientIds) {
    if (recipientId === actorId) {
      continue;
    }

    await client.query(
      `INSERT INTO public.notifications (
         recipient_id, actor_id, type, task_id, message
       ) VALUES ($1, $2, $3, $4, $5)`,
      [
        recipientId,
        actorId,
        "task_assigned",
        task.id,
        `You have been assigned the task "${task.title}".`,
      ],
    );

    // Save an outbox event in the same transaction.
    await client.query(
      `INSERT INTO public.outbox_events (event_type, payload)
       VALUES ($1, $2::jsonb)`,
      [
        "task.assigned",
        JSON.stringify({
          taskId: task.id,
          workspaceId,
          recipientId,
          actorId,
          notificationType: "task_assigned",
        }),
      ],
    );
  }
}

export async function createTask(
  workspaceId: string,
  createdBy: string,
  input: CreateTaskInput,
): Promise<TaskRecord> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const taskResult = await client.query<{ id: string }>(
      `INSERT INTO public.tasks (
         workspace_id,
         project_id,
         title,
         description,
         priority,
         created_by,
         due_date
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        workspaceId,
        input.projectId ?? null,
        input.title,
        input.description ?? null,
        input.priority ?? "medium",
        createdBy,
        input.dueDate ?? null,
      ],
    );

    const taskId = taskResult.rows[0].id;
    const assigneeIds = input.assigneeIds ?? [];

    await addAssignees(client, workspaceId, taskId, assigneeIds);

    const task = await selectTask(client, workspaceId, taskId);

    await client.query(
      `INSERT INTO public.task_activity (
         task_id,
         actor_id,
         action,
         details
       )
       VALUES ($1, $2, $3, $4)`,
      [
        task.id,
        createdBy,
        "created",
        JSON.stringify({
          title: task.title,
          status: task.status,
          priority: task.priority,
        }),
      ],
    );

    await notifyAssigned(client, task, workspaceId, createdBy, assigneeIds);

    await client.query("COMMIT");

    return task;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listTasks(
  workspaceId: string,
  filters: ListTasksQuery,
): Promise<PaginatedTasks> {
  const conditions: string[] = ["workspace_id = $1"];
  const values: unknown[] = [workspaceId];

  // Apply the optional status filter.
  if (filters.status !== undefined) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }

  // Apply the optional priority filter.
  if (filters.priority !== undefined) {
    values.push(filters.priority);
    conditions.push(`priority = $${values.length}`);
  }

  // Apply the optional assignee filter: tasks this user is one of the assignees of.
  if (filters.assignedTo !== undefined) {
    values.push(filters.assignedTo);
    conditions.push(
      `EXISTS (
         SELECT 1 FROM public.task_assignees AS f
         WHERE f.task_id = tasks.id AND f.user_id = $${values.length}
       )`,
    );
  }

  if (filters.projectId !== undefined) {
    values.push(filters.projectId);
    conditions.push(`project_id = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`(title ILIKE $${values.length} OR COALESCE(description, '') ILIKE $${values.length})`);
  }

  const whereClause = conditions.join(" AND ");

  // Count all matching tasks before pagination.
  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM public.tasks
     WHERE ${whereClause}`,
    values,
  );

  const total = Number(countResult.rows[0].total);

  // Calculate the number of rows to skip.
  const offset = (filters.page - 1) * filters.limit;

  // Add pagination values to the existing SQL parameters.
  const paginatedValues = [...values, filters.limit, offset];

  const result = await pool.query<TaskRecord>(
    `SELECT ${taskColumns}
     FROM public.tasks
     WHERE ${whereClause}
     ORDER BY created_at DESC, id DESC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    paginatedValues,
  );

  return {
    tasks: result.rows,
    total,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(total / filters.limit),
  };
}

export async function findTaskById(workspaceId: string,taskId: string,): Promise<TaskRecord | null> {
  const result = await pool.query<TaskRecord>(
    `SELECT ${taskColumns}
     FROM public.tasks
     WHERE workspace_id = $1 AND id = $2
     LIMIT 1`,
    [workspaceId, taskId],
  );

  return result.rows[0] ?? null;
}

export async function updateTask(
  workspaceId: string,
  taskId: string,
  actorId: string,
  input: UpdateTaskInput,
): Promise<TaskRecord | null> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Fetch and lock the current task.
    const existingResult = await client.query<TaskRecord>(
      `SELECT ${taskColumns}
       FROM public.tasks
       WHERE workspace_id = $1 AND id = $2
       FOR UPDATE`,
      [workspaceId, taskId],
    );

    const existingTask = existingResult.rows[0];

    if (!existingTask) {
      await client.query("ROLLBACK");
      return null;
    }

    // 2. Build the update query using only supplied task columns.
    const columnMap: Record<string, string> = {
      title: "title",
      description: "description",
      status: "status",
      priority: "priority",
      projectId: "project_id",
      dueDate: "due_date",
    };

    const values: unknown[] = [workspaceId, taskId];
    const assignments: string[] = [];

    for (const [key, column] of Object.entries(columnMap)) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        values.push(input[key as keyof UpdateTaskInput]);
        assignments.push(`${column} = $${values.length}`);
      }
    }

    // Work out which assignees were added or removed.
    const assigneesProvided = input.assigneeIds !== undefined;
    const nextAssigneeIds = input.assigneeIds ?? existingTask.assigneeIds;
    const addedAssigneeIds = nextAssigneeIds.filter(
      (id) => !existingTask.assigneeIds.includes(id),
    );
    const removedAssigneeIds = existingTask.assigneeIds.filter(
      (id) => !nextAssigneeIds.includes(id),
    );
    const assigneesChanged =
      addedAssigneeIds.length > 0 || removedAssigneeIds.length > 0;

    if (assignments.length === 0 && !assigneesProvided) {
      await client.query("ROLLBACK");
      return existingTask;
    }

    if (assignments.length > 0) {
      await client.query(
        `UPDATE public.tasks
         SET ${assignments.join(", ")}
         WHERE workspace_id = $1 AND id = $2`,
        values,
      );
    }

    if (assigneesChanged) {
      if (removedAssigneeIds.length > 0) {
        await client.query(
          `DELETE FROM public.task_assignees
           WHERE task_id = $1 AND user_id = ANY($2::uuid[])`,
          [taskId, removedAssigneeIds],
        );
      }

      await addAssignees(client, workspaceId, taskId, addedAssigneeIds);

      if (assignments.length === 0) {
        // Bump updated_at even when only the assignees changed.
        await client.query(
          `UPDATE public.tasks SET updated_at = NOW()
           WHERE workspace_id = $1 AND id = $2`,
          [workspaceId, taskId],
        );
      }
    }

    const updatedTask = await selectTask(client, workspaceId, taskId);

    // 3. Record activity for fields that actually changed.
    const activityMap = [
      ["title", "title_changed"],
      ["description", "description_changed"],
      ["status", "status_changed"],
      ["priority", "priority_changed"],
      ["dueDate", "due_date_changed"],
      ["projectId", "project_changed"],
    ] as const;

    for (const [field, action] of activityMap) {
      if (!Object.prototype.hasOwnProperty.call(input, field)) {
        continue;
      }

      const oldValue = existingTask[field];
      const newValue = updatedTask[field];

      const oldComparable =
        oldValue instanceof Date ? oldValue.toISOString() : oldValue;

      const newComparable =
        newValue instanceof Date ? newValue.toISOString() : newValue;

      if (oldComparable === newComparable) {
        continue;
      }

      await client.query(
        `INSERT INTO public.task_activity
           (task_id, actor_id, action, details)
         VALUES ($1, $2, $3, $4)`,
        [
          taskId,
          actorId,
          action,
          JSON.stringify({
            oldValue: oldComparable,
            newValue: newComparable,
          }),
        ],
      );
    }

    if (assigneesChanged) {
      await client.query(
        `INSERT INTO public.task_activity
           (task_id, actor_id, action, details)
         VALUES ($1, $2, $3, $4)`,
        [
          taskId,
          actorId,
          "assignee_changed",
          JSON.stringify({
            oldValue: existingTask.assigneeIds,
            newValue: updatedTask.assigneeIds,
          }),
        ],
      );
    }

    // 4. Notify newly added assignees.
    await notifyAssigned(
      client,
      updatedTask,
      workspaceId,
      actorId,
      addedAssigneeIds,
    );

    // 5. Notify the task creator and previous assignees when status changes.
    const statusChanged = existingTask.status !== updatedTask.status;

    if (statusChanged) {
      // Set prevents duplicate notifications to the same user.
      const recipientIds = new Set<string>();

      if (existingTask.createdBy !== actorId) {
        recipientIds.add(existingTask.createdBy);
      }

      for (const assigneeId of existingTask.assigneeIds) {
        if (assigneeId !== actorId) {
          recipientIds.add(assigneeId);
        }
      }

      for (const recipientId of recipientIds) {
        const notificationMessage =
          `Task "${updatedTask.title}" status changed from "${existingTask.status}" to "${updatedTask.status}".`;

        await client.query(
          `INSERT INTO public.notifications (
             recipient_id,
             actor_id,
             type,
             task_id,
             message
           )
           VALUES ($1, $2, $3, $4, $5)`,
          [
            recipientId,
            actorId,
            "task_status_changed",
            updatedTask.id,
            notificationMessage,
          ],
        );

        // Save an outbox event for this recipient.
        await client.query(
          `INSERT INTO public.outbox_events (
             event_type,
             payload
           )
           VALUES ($1, $2::jsonb)`,
          [
            "task.status_changed",
            JSON.stringify({
              taskId: updatedTask.id,
              workspaceId,
              recipientId,
              actorId,
              previousStatus: existingTask.status,
              newStatus: updatedTask.status,
              notificationType: "task_status_changed",
            }),
          ],
        );
      }
    }

    // 6. Commit the task, activity, notifications, and outbox events together.
    await client.query("COMMIT");

    return updatedTask;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original error if rollback also fails.
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function deleteTask(
  workspaceId: string,
  taskId: string,
): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM public.tasks
     WHERE workspace_id = $1 AND id = $2`,
    [workspaceId, taskId],
  );

  return (result.rowCount ?? 0) > 0;
}
