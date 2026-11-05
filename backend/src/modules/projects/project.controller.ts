import type { Request, Response, NextFunction } from "express";
import { createProject, deleteProject, getProjects, updateProject } from "./project.service.js";
import { AppError } from "../../utils/app-error.js";

const param = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export async function listProjectsController(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = param(req.params.workspaceId);
    if (!workspaceId) throw new AppError(400, "Workspace ID is required");
    const projects = await getProjects(workspaceId, req.user!.id);
    res.status(200).json({ status: "success", data: { projects } });
  } catch (error) { next(error); }
}

export async function createProjectController(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = param(req.params.workspaceId);
    if (!workspaceId) throw new AppError(400, "Workspace ID is required");
    const project = await createProject(workspaceId, req.user!.id, req.body);
    res.status(201).json({ status: "success", message: "Project created successfully", data: { project } });
  } catch (error) { next(error); }
}

export async function updateProjectController(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = param(req.params.workspaceId);
    const projectId = param(req.params.projectId);
    if (!workspaceId || !projectId) throw new AppError(400, "Workspace ID and project ID are required");
    const project = await updateProject(workspaceId, projectId, req.user!.id, req.body);
    res.status(200).json({ status: "success", message: "Project updated successfully", data: { project } });
  } catch (error) { next(error); }
}

export async function deleteProjectController(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = param(req.params.workspaceId);
    const projectId = param(req.params.projectId);
    if (!workspaceId || !projectId) throw new AppError(400, "Workspace ID and project ID are required");
    await deleteProject(workspaceId, projectId, req.user!.id);
    res.status(200).json({ status: "success", message: "Project deleted successfully" });
  } catch (error) { next(error); }
}
