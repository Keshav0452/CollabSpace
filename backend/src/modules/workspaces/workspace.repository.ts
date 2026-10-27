import { pool } from "../../config/database.js";

export interface WorkspaceRecord {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
}

export async function createWorkspace(name: string,userId: string,): Promise<WorkspaceRecord> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<WorkspaceRecord>(
      `
        INSERT INTO public.workspaces (name, created_by)
        VALUES ($1, $2)
        RETURNING
          id,
          name,
          created_by AS "createdBy",
          created_at AS "createdAt"
      `,
      [name, userId],
    );

    const workspace = result.rows[0];

    await client.query(
      `
        INSERT INTO public.workspace_members
          (workspace_id, user_id, role)
        VALUES ($1, $2, $3)
      `,
      [workspace.id, userId, "owner"],
    );

    await client.query("COMMIT");

    return workspace;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listWorkspacesForUser(userId: string) {
  const result = await pool.query(
    `SELECT
       w.id,
       w.name,
       w.created_by AS "createdBy",
       w.created_at AS "createdAt",
       wm.role
     FROM public.workspaces w
     INNER JOIN public.workspace_members wm
       ON wm.workspace_id = w.id
     WHERE wm.user_id = $1
     ORDER BY w.created_at DESC`,
    [userId],
  );

  return result.rows;
}

export async function findWorkspaceForUser( workspaceId: string, userId: string,) {
  const result = await pool.query(
    `SELECT
       w.id,
       w.name,
       w.created_by AS "createdBy",
       w.created_at AS "createdAt",
       wm.role
     FROM public.workspaces w
     INNER JOIN public.workspace_members wm
       ON wm.workspace_id = w.id
     WHERE w.id = $1 AND wm.user_id = $2
     LIMIT 1`,
    [workspaceId, userId],
  );

  return result.rows[0] ?? null;
}

export async function updateWorkspaceName(workspaceId: string,name: string,) {
  const result = await pool.query(
    `UPDATE public.workspaces
     SET name = $1
     WHERE id = $2
     RETURNING id, name, created_by AS "createdBy", created_at AS "createdAt"`,
    [name, workspaceId],
  );

  return result.rows[0] ?? null;
}