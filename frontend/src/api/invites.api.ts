import { apiRequest } from "./client";

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  createdBy: string | null;
  createdByName: string | null;
  expiresAt: string;
  maxUses: number | null;
  useCount: number;
  createdAt: string;
}

export interface InvitePreview {
  workspaceId: string;
  workspaceName: string;
  expiresAt: string;
}

export interface AcceptInviteResult {
  status: "joined" | "already_member";
  workspaceId: string;
  workspaceName: string;
}

export async function createInvite(
  workspaceId: string,
  input: { expiresInDays: number; maxUses: number | null },
): Promise<{ invite: WorkspaceInvite; token: string }> {
  const response = await apiRequest<{
    data: { invite: WorkspaceInvite; token: string };
  }>(`/workspaces/${workspaceId}/invites`, {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
}

export async function getInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
  const response = await apiRequest<{ data: { invites: WorkspaceInvite[] } }>(
    `/workspaces/${workspaceId}/invites`,
  );

  return response.data.invites;
}

export async function revokeInvite(workspaceId: string, inviteId: string): Promise<void> {
  await apiRequest<unknown>(`/workspaces/${workspaceId}/invites/${inviteId}`, {
    method: "DELETE",
  });
}

export async function previewInvite(token: string): Promise<InvitePreview> {
  const response = await apiRequest<{ data: { invite: InvitePreview } }>(
    `/invites/${encodeURIComponent(token)}`,
  );

  return response.data.invite;
}

export async function acceptInvite(token: string): Promise<AcceptInviteResult> {
  const response = await apiRequest<{ data: AcceptInviteResult }>(
    `/invites/${encodeURIComponent(token)}/accept`,
    { method: "POST" },
  );

  return response.data;
}

// Accepts a full invite link or a bare code and returns just the token.
export function extractInviteToken(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/\/invite\/([^/?#\s]+)/);

  return match ? match[1] : trimmed;
}

export function buildInviteLink(token: string): string {
  return `${window.location.origin}/invite/${token}`;
}
