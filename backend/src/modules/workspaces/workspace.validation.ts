import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const addWorkspaceMemberSchema = z.object({
  email: z.string().trim().email().max(254),
});

export const removeWorkspaceMemberSchema = z.object({
  userId: z.string().uuid("A valid user ID is required"),
});

export const updateMemberRoleSchema = z.object({
role: z.enum(["admin", "member"]),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type RemoveWorkspaceMemberInput = z.infer<typeof removeWorkspaceMemberSchema>;
export type AddWorkspaceMemberInput = z.infer< typeof addWorkspaceMemberSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;