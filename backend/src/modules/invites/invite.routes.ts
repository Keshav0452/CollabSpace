import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { validateBody } from "../../middleware/validate.js";
import {
  acceptInviteController,
  createInviteController,
  listInvitesController,
  previewInviteController,
  revokeInviteController,
} from "./invite.controller.js";
import { createInviteSchema } from "./invite.validation.js";

// Throttle token guessing on the endpoints that take an invite token.
const inviteTokenRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  scope: "invite-token",
});

// Mounted at /api/workspaces: managing a workspace's invites.
export const workspaceInviteRouter = Router();

workspaceInviteRouter.post("/:workspaceId/invites", authenticate, validateBody(createInviteSchema), createInviteController);
workspaceInviteRouter.get("/:workspaceId/invites", authenticate, listInvitesController);
workspaceInviteRouter.delete("/:workspaceId/invites/:inviteId", authenticate, revokeInviteController);

// Mounted at /api/invites: using an invite token.
export const inviteRouter = Router();

inviteRouter.get("/:token", authenticate, inviteTokenRateLimit, previewInviteController);
inviteRouter.post("/:token/accept", authenticate, inviteTokenRateLimit, acceptInviteController);
