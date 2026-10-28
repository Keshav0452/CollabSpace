import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  page: z.coerce
    .number()
    .int("Page must be an integer")
    .min(1, "Page must be at least 1")
    .default(1),

  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(20),

  unreadOnly: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .default(false),
});

export type ListNotificationsQuery = z.infer<
  typeof listNotificationsQuerySchema
>;