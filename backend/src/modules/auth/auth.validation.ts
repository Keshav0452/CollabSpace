    
import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),

  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .max(254, "Email is too long"),

  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password must be at most 128 characters"),
});

export type RegisterRequest = z.infer<typeof registerSchema>;
