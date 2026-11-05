import { AppError } from "../../utils/app-error.js";
import { findWorkspaceForUser } from "../workspaces/workspace.repository.js";
import {
  acceptInvite as acceptInviteRecord,
  createInvite as createInviteRecord,
  listActiveInvites,
  previewInvite as previewInviteRecord,
  revokeInvite as revokeInviteRecord,
} from "./invite.repository.js";
import type { CreateInviteInput } from "./invite.validation.js";

const INVALID_INVITE_MESSAGE = "This invite link is invalid, expired or has been revoked";

async function requireInviteManager(workspaceId: string, userId: string) {
  const workspace = await findWorkspaceForUser(workspaceId, userId);

  if (!workspace) {
    throw new AppError(404, "Workspace not found");
  }

  if (workspace.role !== "owner" && workspace.role !== "admin") {
    throw new AppError(403, "You do not have permission to manage invites");
  }
}

export async function createInvite(
  workspaceId: string,
  userId: string,
  input: CreateInviteInput,
) {
  await requireInviteManager(workspaceId, userId);

  return createInviteRecord(workspaceId, userId, input.expiresInDays, input.maxUses);
}

export async function getInvites(workspaceId: string, userId: string) {
  await requireInviteManager(workspaceId, userId);

  return listActiveInvites(workspaceId);
}

export async function revokeInvite(
  workspaceId: string,
  userId: string,
  inviteId: string,
) {
  await requireInviteManager(workspaceId, userId);

  const revoked = await revokeInviteRecord(workspaceId, inviteId);

  if (!revoked) {
    throw new AppError(404, "Invite not found");
  }
}

export async function previewInvite(token: string) {
  const invite = await previewInviteRecord(token);

  if (!invite) {
    throw new AppError(404, INVALID_INVITE_MESSAGE);
  }

  return invite;
}

export async function acceptInvite(token: string, userId: string) {
  const result = await acceptInviteRecord(token, userId);

  if (result.status === "invalid") {
    throw new AppError(404, INVALID_INVITE_MESSAGE);
  }

  return result;
}
