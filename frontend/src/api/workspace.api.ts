
import { apiRequest } from "./client";

export interface Workspace {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  role: "owner" | "admin" | "member";
}

interface WorkspacesResponse {
  status: "success";
  data: {
    workspaces: Workspace[];
  };
}

interface WorkspaceResponse {
  status: "success";
  data: {
    workspace: Workspace;
  };
}

export interface CreateWorkspaceInput {
  name: string;
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const response = await apiRequest<WorkspacesResponse>(
    "/workspaces",
  );

  return response.data.workspaces;
}

export async function getWorkspace(
  workspaceId: string,
): Promise<Workspace> {
  const response = await apiRequest<WorkspaceResponse>(
    `/workspaces/${workspaceId}`,
  );

  return response.data.workspace;
}

export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<Workspace> {
  const response = await apiRequest<WorkspaceResponse>(
    "/workspaces",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return response.data.workspace;
}

export async function renameWorkspace(
  workspaceId: string,
  input: CreateWorkspaceInput,
): Promise<Workspace> {
  const response = await apiRequest<WorkspaceResponse>(
    `/workspaces/${workspaceId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return response.data.workspace;
}
