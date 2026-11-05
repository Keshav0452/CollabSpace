import { pool } from "../../config/database.js";

export interface CreateUserRecord {
  name: string;
  email: string;
  passwordHash: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export async function createUser(input: CreateUserRecord,): Promise<UserRecord> {
  const result = await pool.query<UserRecord>(
    `
      INSERT INTO public.users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING
        id,
        name,
        email,
        created_at AS "createdAt"
    `,
    [input.name, input.email, input.passwordHash],
  );

  return result.rows[0];
}


export interface LoginUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  tokenVersion: number;
}

export async function findUserByEmail(
  email: string,
): Promise<LoginUserRecord | null> {
  const result = await pool.query<LoginUserRecord>(
    `
      SELECT
        id,
        name,
        email,
        password_hash AS "passwordHash",
        token_version AS "tokenVersion"
      FROM public.users
      WHERE email = $1
      LIMIT 1
    `,
    [email],
  );

  return result.rows[0] ?? null;
}

export async function findUserById(userId: string) {
  const result = await pool.query<{ id: string; name: string; email: string }>(
    `SELECT id, name, email FROM public.users WHERE id = $1 LIMIT 1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function updateUserProfile(userId: string, name: string, email: string) {
  const result = await pool.query<{ id: string; name: string; email: string }>(
    `UPDATE public.users SET name = $1, email = $2 WHERE id = $3
     RETURNING id, name, email`,
    [name, email, userId],
  );
  return result.rows[0] ?? null;
}

export async function updateUserPasswordHash(userId: string, passwordHash: string): Promise<void> {
  await pool.query(`UPDATE public.users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2`, [passwordHash, userId]);
}
