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
        password_hash AS "passwordHash"
      FROM public.users
      WHERE email = $1
      LIMIT 1
    `,
    [email],
  );

  return result.rows[0] ?? null;
}