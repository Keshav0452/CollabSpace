import argon2 from "argon2";
import { AppError } from "../../utils/app-error.js";
import { pool } from "../../config/database.js";
import { findUserByEmail, findUserById, updateUserPasswordHash, updateUserProfile } from "./auth.repository.js";
import type { ChangePasswordInput, UpdateProfileInput } from "./auth.validation.js";

export async function getAccountProfile(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw new AppError(404, "User not found");
  return user;
}

export async function updateAccountProfile(userId: string, input: UpdateProfileInput) {
  const email = input.email.trim().toLowerCase();
  const existing = await findUserByEmail(email);
  if (existing && existing.id !== userId) throw new AppError(409, "An account with this email already exists");
  try {
    const user = await updateUserProfile(userId, input.name.trim(), email);
    if (!user) throw new AppError(404, "User not found");
    return user;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new AppError(409, "An account with this email already exists");
    throw error;
  }
}

export async function changeAccountPassword(userId: string, input: ChangePasswordInput) {
  const user = await findUserByIdWithPassword(userId);
  if (!user) throw new AppError(404, "User not found");
  const valid = await argon2.verify(user.passwordHash, input.currentPassword);
  if (!valid) throw new AppError(400, "Current password is incorrect");
  const passwordHash = await argon2.hash(input.newPassword);
  await updateUserPasswordHash(userId, passwordHash);
}

async function findUserByIdWithPassword(userId: string) {
  const result = await pool.query<{ id: string; passwordHash: string }>(
    `SELECT id, password_hash AS "passwordHash" FROM public.users WHERE id = $1 LIMIT 1`,
    [userId],
  );
  return result.rows[0] ?? null;
}
