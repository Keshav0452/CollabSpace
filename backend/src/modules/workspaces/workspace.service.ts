import {updateWorkspaceMemberRole,createWorkspace as createWorkspaceRecord,findUserByEmail,addWorkspaceMember as insertWorkspaceMember,} from "./workspace.repository.js";
import type { UpdateMemberRoleInput,CreateWorkspaceInput, UpdateWorkspaceInput,AddWorkspaceMemberInput , RemoveWorkspaceMemberInput} from "./workspace.validation.js";
import { listWorkspacesForUser as listWorkspaces ,removeWorkspaceMember as deleteWorkspaceMember,findWorkspaceForUser, updateWorkspaceName,listWorkspaceMembers as fetchWorkspaceMembers, findWorkspaceMember} from "./workspace.repository.js";
import { AppError } from "../../utils/app-error.js";

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

export async function addMemberToWorkspace( workspaceId: string, requesterId: string, input: AddWorkspaceMemberInput,) {
  const workspace = await findWorkspaceForUser(workspaceId, requesterId);

  if (!workspace) {
    throw new AppError(404, "Workspace not found");
  }

  if (workspace.role !== "owner" && workspace.role !== "admin") {
    throw new AppError(403, "You do not have permission to add members");
  }

  const user = await findUserByEmail(input.email);

  if (!user) {
    throw new AppError(404, "No registered user found with this email");
  }

  const membership = await insertWorkspaceMember(workspaceId, user.id);

  if (!membership) {
    throw new AppError(409, "User is already a member of this workspace");
  }

  return {
    ...membership,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}

export async function getWorkspaceMembers(
  workspaceId: string,
  requesterId: string,
) {
  const workspace = await findWorkspaceForUser(workspaceId, requesterId);

  if (!workspace) {
    throw new AppError(404, "Workspace not found");
  }

  return fetchWorkspaceMembers(workspaceId);
}

export async function removeMemberFromWorkspace(
  workspaceId: string,
  requesterId: string,
  input: RemoveWorkspaceMemberInput,
) {
  const workspace = await findWorkspaceForUser(workspaceId, requesterId);

  if (!workspace) {
    throw new AppError(404, "Workspace not found");
  }

  if (workspace.role !== "owner" && workspace.role !== "admin") {
    throw new AppError(403, "You do not have permission to remove members");
  }

  if (input.userId === requesterId) {
    throw new AppError(400, "You cannot remove yourself through this endpoint");
  }

  const target = await findWorkspaceMember(workspaceId, input.userId);

  if (!target) {
    throw new AppError(404, "Workspace member not found");
  }

  if (target.role === "owner") {
    throw new AppError(403, "The workspace owner cannot be removed");
  }

  const removed = await deleteWorkspaceMember(workspaceId, input.userId);

  if (!removed) {
    throw new AppError(404, "Workspace member not found");
  }
}

export async function changeWorkspaceMemberRole(
  workspaceId: string,
  requesterId: string,
  targetUserId: string,
  input: UpdateMemberRoleInput,
) {
  const workspace = await findWorkspaceForUser(workspaceId, requesterId);

  if (!workspace) {
    throw new AppError(404, "Workspace not found");
  }

  // Only the workspace owner can manage roles.
  if (workspace.role !== "owner") {
    throw new AppError(403, "Only the workspace owner can change member roles");
  }

  const target = await findWorkspaceMember(workspaceId, targetUserId);

  if (!target) {
    throw new AppError(404, "Workspace member not found");
  }

  if (target.role === "owner") {
    throw new AppError(403, "The workspace owner's role cannot be changed here");
  }

  const updatedMember = await updateWorkspaceMemberRole(
    workspaceId,
    targetUserId,
    input.role,
  );

  if (!updatedMember) {
    throw new AppError(404, "Workspace member not found");
  }

  return updatedMember;
}