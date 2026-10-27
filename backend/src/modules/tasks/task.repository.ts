import { pool } from "../../config/database.js";
import type {
  CreateTaskInput,
  UpdateTaskInput,
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

export async function createTask(workspaceId: string,createdBy: string,input: CreateTaskInput,): Promise<TaskRecord> {
  const result = await pool.query<TaskRecord>(
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

  return result.rows[0];
}

export async function listTasks(workspaceId: string,): Promise<TaskRecord[]> {
  const result = await pool.query<TaskRecord>(
    `SELECT ${taskColumns}
     FROM public.tasks
     WHERE workspace_id = $1
     ORDER BY created_at DESC`,
    [workspaceId],
  );

  return result.rows;
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
  input: UpdateTaskInput,
): Promise<TaskRecord | null> {
  const fields: string[] = [];
  const values: unknown[] = [];

  function addField(column: string, value: unknown): void {
    values.push(value);
    fields.push(`${column} = $${values.length}`);
  }

  if (input.title !== undefined) addField("title", input.title);
  if (input.description !== undefined) addField("description", input.description);
  if (input.status !== undefined) addField("status", input.status);
  if (input.priority !== undefined) addField("priority", input.priority);
  if (input.assignedTo !== undefined) addField("assigned_to", input.assignedTo);
  if (input.dueDate !== undefined) addField("due_date", input.dueDate);

  if (fields.length === 0) {
    return findTaskById(workspaceId, taskId);
  }

  values.push(workspaceId);
  const workspaceParameter = values.length;

  values.push(taskId);
  const taskParameter = values.length;

  const result = await pool.query<TaskRecord>(
    `UPDATE public.tasks
     SET ${fields.join(", ")}
     WHERE workspace_id = $${workspaceParameter}
       AND id = $${taskParameter}
     RETURNING ${taskColumns}`,
    values,
  );

  return result.rows[0] ?? null;
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
