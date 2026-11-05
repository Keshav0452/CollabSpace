import { apiRequest } from "./client";

export type MemberRole = "owner" | "admin" | "member";

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  joinedAt: string;
}

interface MembersResponse {
  status: "success";
  data: {
    members: WorkspaceMember[];
  };
}

export async function getMembers(
  workspaceId: string,
): Promise<WorkspaceMember[]> {
  const response = await apiRequest<MembersResponse>(
    `/workspaces/${workspaceId}/members`,
  );

  return response.data.members;
}

export async function addMember(
  workspaceId: string,
  email: string,
): Promise<void> {
  await apiRequest<unknown>(`/workspaces/${workspaceId}/members`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function removeMember(
  workspaceId: string,
  userId: string,
): Promise<void> {
  await apiRequest<unknown>(`/workspaces/${workspaceId}/members`, {
    method: "DELETE",
    body: JSON.stringify({ userId }),
  });
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: "admin" | "member",
): Promise<void> {
  await apiRequest<unknown>(
    `/workspaces/${workspaceId}/members/${userId}/role`,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    },
  );
}
