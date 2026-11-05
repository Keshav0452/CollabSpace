import type { Request, Response, NextFunction } from "express";
import {
  acceptInvite,
  createInvite,
  getInvites,
  previewInvite,
  revokeInvite,
} from "./invite.service.js";
import type { CreateInviteInput } from "./invite.validation.js";

function param(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export async function createInviteController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { invite, token } = await createInvite(
      param(req.params.workspaceId),
      req.user!.id,
      req.body as CreateInviteInput,
    );

    // The raw token is only ever returned here; it cannot be recovered later.
    res.status(201).json({
      status: "success",
      message: "Invite created",
      data: { invite, token },
    });
  } catch (error) {
    next(error);
  }
}

export async function listInvitesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const invites = await getInvites(param(req.params.workspaceId), req.user!.id);

    res.status(200).json({ status: "success", data: { invites } });
  } catch (error) {
    next(error);
  }
}

export async function revokeInviteController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await revokeInvite(
      param(req.params.workspaceId),
      req.user!.id,
      param(req.params.inviteId),
    );

    res.status(200).json({ status: "success", message: "Invite revoked" });
  } catch (error) {
    next(error);
  }
}

export async function previewInviteController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const invite = await previewInvite(param(req.params.token));

    res.status(200).json({ status: "success", data: { invite } });
  } catch (error) {
    next(error);
  }
}

export async function acceptInviteController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await acceptInvite(param(req.params.token), req.user!.id);

    res.status(200).json({
      status: "success",
      message:
        result.status === "joined"
          ? "You have joined the workspace"
          : "You are already a member of this workspace",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
