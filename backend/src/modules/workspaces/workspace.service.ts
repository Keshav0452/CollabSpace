import {createWorkspace as createWorkspaceRecord,} from "./workspace.repository.js";
import type { CreateWorkspaceInput } from "./workspace.validation.js";
import { listWorkspacesForUser as listWorkspaces } from "./workspace.repository.js";
import { findWorkspaceForUser, updateWorkspaceName, } from "./workspace.repository.js";
import { AppError } from "../../utils/app-error.js";
import type { UpdateWorkspaceInput } from "./workspace.validation.js";

export async function createWorkspace(input: CreateWorkspaceInput,userId: string,) {
  return createWorkspaceRecord(input.name, userId);
}

export async function getWorkspacesForUser(userId: string) {
  return listWorkspaces(userId);
}

export async function getWorkspaceForUser( workspaceId: string, userId: string,) {
  return findWorkspaceForUser(workspaceId, userId);
}

export async function renameWorkspace(workspaceId: string,userId: string,input: UpdateWorkspaceInput,) {
  const workspace = await findWorkspaceForUser(workspaceId, userId);

  if (!workspace) {
    throw new AppError(404, "Workspace not found");
  }

  if (workspace.role !== "owner" && workspace.role !== "admin") {
    throw new AppError(403, "You do not have permission to rename this workspace");
  }

  const updatedWorkspace = await updateWorkspaceName(
    workspaceId,
    input.name,
  );

  if (!updatedWorkspace) {
    throw new AppError(404, "Workspace not found");
  }

  return updatedWorkspace;
}