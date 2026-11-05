import { z } from "zod";

export const createInviteSchema = z.object({
  // How long the link stays valid.
  expiresInDays: z.number().int().min(1).max(30).default(7),
  // null means unlimited uses.
  maxUses: z.number().int().min(1).max(1000).nullable().default(null),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
