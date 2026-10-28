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
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string | null;
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

const taskColumns = `
  id,
  workspace_id AS "workspaceId",
  title,
  description,
  status,
  priority,
  assigned_to AS "assignedTo",
  created_by AS "createdBy",
  due_date AS "dueDate",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export async function createTask(
  workspaceId: string,
  createdBy: string,
  input: CreateTaskInput,
): Promise<TaskRecord> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const taskResult = await client.query<TaskRecord>(
      `INSERT INTO public.tasks (
         workspace_id,
         title,
         description,
         priority,
         assigned_to,
         created_by,
         due_date
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${taskColumns}`,
      [
        workspaceId,
        input.title,
        input.description ?? null,
        input.priority ?? "medium",
        input.assignedTo ?? null,
        createdBy,
        input.dueDate ?? null,
      ],
    );

    const task = taskResult.rows[0];

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

  // Apply the optional assignee filter.
  if (filters.assignedTo !== undefined) {
    values.push(filters.assignedTo);
    conditions.push(`assigned_to = $${values.length}`);
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

    // 2. Build the update query using only supplied fields.
    const columnMap: Record<string, string> = {
      title: "title",
      description: "description",
      status: "status",
      priority: "priority",
      assignedTo: "assigned_to",
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

    if (assignments.length === 0) {
      await client.query("ROLLBACK");
      return existingTask;
    }

    const updatedResult = await client.query<TaskRecord>(
      `UPDATE public.tasks
       SET ${assignments.join(", ")}
       WHERE workspace_id = $1 AND id = $2
       RETURNING ${taskColumns}`,
      values,
    );

    const updatedTask = updatedResult.rows[0];

    if (!updatedTask) {
      throw new Error("Task update returned no record");
    }

    // 3. Record activity for fields that actually changed.
    const activityMap = [
      ["title", "title_changed"],
      ["description", "description_changed"],
      ["status", "status_changed"],
      ["priority", "priority_changed"],
      ["assignedTo", "assignee_changed"],
      ["dueDate", "due_date_changed"],
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

    // 4. Notify the new assignee when the assignment changes.
    const previousAssigneeId = existingTask.assignedTo;
    const newAssigneeId = updatedTask.assignedTo;

    const assigneeChanged =
      newAssigneeId !== null &&
      newAssigneeId !== previousAssigneeId;

    if (assigneeChanged && newAssigneeId !== null) {
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
          newAssigneeId,
          actorId,
          "task_assigned",
          updatedTask.id,
          `You have been assigned the task "${updatedTask.title}".`,
        ],
      );
    }

    // 5. Notify the task creator and previous assignee when status changes.
    const statusChanged = existingTask.status !== updatedTask.status;

    if (statusChanged) {
      // A Set prevents duplicate notifications to the same user.
      const recipientIds = new Set<string>();

      // Notify the task creator unless they made the change.
      if (existingTask.createdBy !== actorId) {
        recipientIds.add(existingTask.createdBy);
      }

      // Notify the previous assignee unless they made the change.
      if (
        existingTask.assignedTo &&
        existingTask.assignedTo !== actorId
      ) {
        recipientIds.add(existingTask.assignedTo);
      }

      for (const recipientId of recipientIds) {
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
            `Task "${updatedTask.title}" status changed from "${existingTask.status}" to "${updatedTask.status}".`,
          ],
        );
      }
    }

    // 6. Commit the task update, activity, and notifications together.
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
