import type { Request, Response, NextFunction } from "express";
import { removeMemberFromWorkspace,createWorkspace ,getWorkspacesForUser,getWorkspaceForUser,renameWorkspace, addMemberToWorkspace, getWorkspaceMembers,changeWorkspaceMemberRole} from "./workspace.service.js";
import type { CreateWorkspaceInput,UpdateWorkspaceInput,AddWorkspaceMemberInput,RemoveWorkspaceMemberInput,UpdateMemberRoleInput } from "./workspace.validation.js";



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

export async function addWorkspaceMemberController(
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

    const member = await addMemberToWorkspace(
      workspaceId,
      req.user!.id,
      req.body as AddWorkspaceMemberInput,
    );

    res.status(201).json({
      status: "success",
      message: "Member added successfully",
      data: { member },
    });
  } catch (error) {
    next(error);
  }
}

export async function listWorkspaceMembersController(
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

    const members = await getWorkspaceMembers(
      workspaceId,
      req.user!.id,
    );

    res.status(200).json({
      status: "success",
      data: { members },
    });
  } catch (error) {
    next(error);
  }
}

export async function removeWorkspaceMemberController(
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

    await removeMemberFromWorkspace(
      workspaceId,
      req.user!.id,
      req.body as RemoveWorkspaceMemberInput,
    );

    res.status(200).json({
      status: "success",
      message: "Workspace member removed successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function updateWorkspaceMemberRoleController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = Array.isArray(req.params.workspaceId)
      ? req.params.workspaceId[0]
      : req.params.workspaceId;
    const userId = Array.isArray(req.params.userId)
      ? req.params.userId[0]
      : req.params.userId;

    if (!workspaceId || !userId) {
      res.status(400).json({
        status: "error",
        message: "Workspace ID and user ID are required",
      });
      return;
    }

    const member = await changeWorkspaceMemberRole(
      workspaceId,
      req.user!.id,
      userId,
      req.body as UpdateMemberRoleInput,
    );

    res.status(200).json({
      status: "success",
      message: "Member role updated successfully",
      data: { member },
    });
  } catch (error) {
    next(error);
  }
}