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