import { createHash, randomBytes } from "node:crypto";
import { pool } from "../../config/database.js";

export interface InviteRecord {
  id: string;
  workspaceId: string;
  createdBy: string | null;
  createdByName: string | null;
  expiresAt: Date;
  maxUses: number | null;
  useCount: number;
  createdAt: Date;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const inviteColumns = `
  i.id,
  i.workspace_id AS "workspaceId",
  i.created_by AS "createdBy",
  u.name AS "createdByName",
  i.expires_at AS "expiresAt",
  i.max_uses AS "maxUses",
  i.use_count AS "useCount",
  i.created_at AS "createdAt"
`;

// An invite can be used while it is not revoked, not expired and not used up.
const activeCondition = `
  i.revoked_at IS NULL
  AND i.expires_at > NOW()
  AND (i.max_uses IS NULL OR i.use_count < i.max_uses)
`;

export async function createInvite(
  workspaceId: string,
  createdBy: string,
  expiresInDays: number,
  maxUses: number | null,
): Promise<{ invite: InviteRecord; token: string }> {
  const token = randomBytes(32).toString("base64url");

  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO public.workspace_invites
       (workspace_id, token_hash, created_by, expires_at, max_uses)
     VALUES ($1, $2, $3, NOW() + make_interval(days => $4), $5)
     RETURNING id`,
    [workspaceId, hashToken(token), createdBy, expiresInDays, maxUses],
  );

  const result = await pool.query<InviteRecord>(
    `SELECT ${inviteColumns}
     FROM public.workspace_invites AS i
     LEFT JOIN public.users AS u ON u.id = i.created_by
     WHERE i.id = $1`,
    [inserted.rows[0].id],
  );

  return { invite: result.rows[0], token };
}

export async function listActiveInvites(
  workspaceId: string,
): Promise<InviteRecord[]> {
  const result = await pool.query<InviteRecord>(
    `SELECT ${inviteColumns}
     FROM public.workspace_invites AS i
     LEFT JOIN public.users AS u ON u.id = i.created_by
     WHERE i.workspace_id = $1 AND ${activeCondition}
     ORDER BY i.created_at DESC`,
    [workspaceId],
  );

  return result.rows;
}

export async function revokeInvite(
  workspaceId: string,
  inviteId: string,
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE public.workspace_invites
     SET revoked_at = NOW()
     WHERE workspace_id = $1 AND id = $2 AND revoked_at IS NULL`,
    [workspaceId, inviteId],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function previewInvite(token: string) {
  const result = await pool.query<{
    workspaceId: string;
    workspaceName: string;
    expiresAt: Date;
  }>(
    `SELECT
       w.id AS "workspaceId",
       w.name AS "workspaceName",
       i.expires_at AS "expiresAt"
     FROM public.workspace_invites AS i
     INNER JOIN public.workspaces AS w ON w.id = i.workspace_id
     WHERE i.token_hash = $1 AND ${activeCondition}`,
    [hashToken(token)],
  );

  return result.rows[0] ?? null;
}

export type AcceptResult =
  | { status: "invalid" }
  | {
      status: "joined" | "already_member";
      workspaceId: string;
      workspaceName: string;
    };

// Joins the user to the invite's workspace in a single transaction so that
// concurrent requests cannot exceed the invite's max uses.
export async function acceptInvite(
  token: string,
  userId: string,
): Promise<AcceptResult> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const inviteResult = await client.query<{
      id: string;
      workspaceId: string;
      workspaceName: string;
    }>(
      `SELECT i.id, i.workspace_id AS "workspaceId", w.name AS "workspaceName"
       FROM public.workspace_invites AS i
       INNER JOIN public.workspaces AS w ON w.id = i.workspace_id
       WHERE i.token_hash = $1 AND ${activeCondition}
       FOR UPDATE OF i`,
      [hashToken(token)],
    );

    const invite = inviteResult.rows[0];

    if (!invite) {
      await client.query("ROLLBACK");
      return { status: "invalid" };
    }

    const memberInsert = await client.query(
      `INSERT INTO public.workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT (workspace_id, user_id) DO NOTHING`,
      [invite.workspaceId, userId],
    );

    const joined = (memberInsert.rowCount ?? 0) > 0;

    // Existing members do not consume a use of the invite.
    if (joined) {
      await client.query(
        `UPDATE public.workspace_invites
         SET use_count = use_count + 1
         WHERE id = $1`,
        [invite.id],
      );
    }

    await client.query("COMMIT");

    return {
      status: joined ? "joined" : "already_member",
      workspaceId: invite.workspaceId,
      workspaceName: invite.workspaceName,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Keep the original error.
    }
    throw error;
  } finally {
    client.release();
  }
}
