import type { Request, Response, NextFunction } from "express";
import { createWorkspace ,getWorkspacesForUser,getWorkspaceForUser,renameWorkspace } from "./workspace.service.js";
import type { CreateWorkspaceInput,UpdateWorkspaceInput } from "./workspace.validation.js";



export async function createWorkspaceController( req: Request, res: Response, next: NextFunction,): Promise<void> {
  try {
    const input = req.body as CreateWorkspaceInput;
    const userId = req.user!.id;

    const workspace = await createWorkspace(input, userId);

    res.status(201).json({
      status: "success",
      message: "Workspace created successfully",
      data: { workspace },
    });
  } catch (error) {
    next(error);
  }
}

export async function listWorkspacesController( req: Request,res: Response,next: NextFunction,): Promise<void> {
  try {
    const workspaces = await getWorkspacesForUser(req.user!.id);

    res.status(200).json({
      status: "success",
      data: { workspaces },
    });
  } catch (error) {
    next(error);
  }
}

export async function getWorkspaceController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = Array.isArray(req.params.workspaceId)
      ? req.params.workspaceId[0]
      : req.params.workspaceId;

    if (!workspaceId) {
      res.status(400).json({
        status: "error",
        message: "Invalid workspace id",
      });
      return;
    }

    const workspace = await getWorkspaceForUser(workspaceId, req.user!.id);

    if (!workspace) {
      res.status(404).json({
        status: "error",
        message: "Workspace not found",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      data: { workspace },
    });
  } catch (error) {
    next(error);
  }
}

export async function renameWorkspaceController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = Array.isArray(req.params.workspaceId)
      ? req.params.workspaceId[0]
      : req.params.workspaceId;

    if (!workspaceId) {
      res.status(400).json({
        status: "error",
        message: "Workspace ID is required",
      });
      return;
    }

    const workspace = await renameWorkspace(
      workspaceId,
      req.user!.id,
      req.body as UpdateWorkspaceInput,
    );

    res.status(200).json({
      status: "success",
      message: "Workspace renamed successfully",
      data: { workspace },
    });
  } catch (error) {
    next(error);
  }
}