import { pool } from "../../config/database.js";
import type { CreateProjectInput, UpdateProjectInput } from "./project.validation.js";

export interface ProjectRecord {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: "active" | "archived";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  taskCount?: number;
}

const projectColumns = `p.id, p.workspace_id AS "workspaceId", p.name, p.description,
  p.status, p.created_by AS "createdBy", p.created_at AS "createdAt",
  p.updated_at AS "updatedAt"`;

export async function listProjects(workspaceId: string): Promise<ProjectRecord[]> {
  const result = await pool.query<ProjectRecord>(
    `SELECT ${projectColumns}, COUNT(t.id)::int AS "taskCount"
     FROM public.projects p
     LEFT JOIN public.tasks t ON t.project_id = p.id AND t.workspace_id = p.workspace_id
     WHERE p.workspace_id = $1
     GROUP BY p.id
     ORDER BY CASE WHEN p.status = 'active' THEN 0 ELSE 1 END, p.created_at DESC`,
    [workspaceId],
  );
  return result.rows;
}

export async function findProject(workspaceId: string, projectId: string): Promise<ProjectRecord | null> {
  const result = await pool.query<ProjectRecord>(
    `SELECT ${projectColumns}, COUNT(t.id)::int AS "taskCount"
     FROM public.projects p
     LEFT JOIN public.tasks t ON t.project_id = p.id AND t.workspace_id = p.workspace_id
     WHERE p.workspace_id = $1 AND p.id = $2
     GROUP BY p.id LIMIT 1`,
    [workspaceId, projectId],
  );
  return result.rows[0] ?? null;
}

export async function insertProject(workspaceId: string, createdBy: string, input: CreateProjectInput): Promise<ProjectRecord> {
  const result = await pool.query<ProjectRecord>(
    `INSERT INTO public.projects (workspace_id, name, description, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, workspace_id AS "workspaceId", name, description, status,
       created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [workspaceId, input.name, input.description ?? "", createdBy],
  );
  return result.rows[0];
}

export async function updateProjectRecord(workspaceId: string, projectId: string, input: UpdateProjectInput): Promise<ProjectRecord | null> {
  const columns: Record<string, string> = { name: "name", description: "description", status: "status" };
  const values: unknown[] = [workspaceId, projectId];
  const updates: string[] = [];
  for (const [key, column] of Object.entries(columns)) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      values.push(input[key as keyof UpdateProjectInput]);
      updates.push(`${column} = $${values.length}`);
    }
  }
  if (!updates.length) return findProject(workspaceId, projectId);
  const result = await pool.query<ProjectRecord>(
    `UPDATE public.projects SET ${updates.join(", ")}
     WHERE workspace_id = $1 AND id = $2
     RETURNING id, workspace_id AS "workspaceId", name, description, status,
       created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"`,
    values,
  );
  return result.rows[0] ?? null;
}

export async function deleteProjectRecord(
  workspaceId: string,
  projectId: string,
  actorId: string,
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO public.task_activity (task_id, actor_id, action, details)
       SELECT id, $3, 'project_changed',
         jsonb_build_object('oldValue', project_id, 'newValue', NULL)
       FROM public.tasks
       WHERE workspace_id = $1 AND project_id = $2`,
      [workspaceId, projectId, actorId],
    );
    const result = await client.query(
      `DELETE FROM public.projects WHERE workspace_id = $1 AND id = $2 RETURNING id`,
      [workspaceId, projectId],
    );
    await client.query("COMMIT");
    return result.rowCount === 1;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
