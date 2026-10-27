import { z } from "zod";

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title is required")
    .max(200, "Task title must be at most 200 characters"),

  description: z
    .string()
    .trim()
    .max(5000, "Description must be at most 5000 characters")
    .optional(),

  priority: z.enum(["low", "medium", "high"]).optional(),

  assignedTo: z
    .string()
    .uuid("A valid assignee ID is required")
    .nullable()
    .optional(),

  dueDate: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Task title is required")
      .max(200, "Task title must be at most 200 characters")
      .optional(),

    description: z
      .string()
      .trim()
      .max(5000, "Description must be at most 5000 characters")
      .nullable()
      .optional(),

    status: z
      .enum(["todo", "in_progress", "done", "blocked"])
      .optional(),

    priority: z
      .enum(["low", "medium", "high"])
      .optional(),

    assignedTo: z
      .string()
      .uuid("A valid assignee ID is required")
      .nullable()
      .optional(),

    dueDate: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update",
  );

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;