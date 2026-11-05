import { AppError } from "../../utils/app-error.js";
import { findWorkspaceForUser } from "../workspaces/workspace.repository.js";
import { deleteProjectRecord, findProject, insertProject, listProjects, updateProjectRecord } from "./project.repository.js";
import type { CreateProjectInput, UpdateProjectInput } from "./project.validation.js";

async function requireWorkspace(workspaceId: string, userId: string) {
  const workspace = await findWorkspaceForUser(workspaceId, userId);
  if (!workspace) throw new AppError(404, "Workspace not found");
  return workspace;
}

export async function getProjects(workspaceId: string, userId: string) {
  await requireWorkspace(workspaceId, userId);
  return listProjects(workspaceId);
}

export async function createProject(workspaceId: string, userId: string, input: CreateProjectInput) {
  await requireWorkspace(workspaceId, userId);
  try {
    return await insertProject(workspaceId, userId, input);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new AppError(409, "A project with this name already exists in this workspace");
    throw error;
  }
}

export async function updateProject(workspaceId: string, projectId: string, userId: string, input: UpdateProjectInput) {
  const workspace = await requireWorkspace(workspaceId, userId);
  if (workspace.role === "member" && input.status !== undefined) {
    throw new AppError(403, "Only workspace owners and admins can archive or reactivate projects");
  }
  const existing = await findProject(workspaceId, projectId);
  if (!existing) throw new AppError(404, "Project not found");
  try {
    const updated = await updateProjectRecord(workspaceId, projectId, input);
    if (!updated) throw new AppError(404, "Project not found");
    return updated;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new AppError(409, "A project with this name already exists in this workspace");
    throw error;
  }
}

export async function deleteProject(workspaceId: string, projectId: string, userId: string) {
  const workspace = await requireWorkspace(workspaceId, userId);
  if (workspace.role !== "owner" && workspace.role !== "admin") throw new AppError(403, "Only workspace owners and admins can delete projects");
  const deleted = await deleteProjectRecord(workspaceId, projectId, userId);
  if (!deleted) throw new AppError(404, "Project not found");
}
