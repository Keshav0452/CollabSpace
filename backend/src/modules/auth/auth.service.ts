import argon2 from "argon2";
import { createUser } from "./auth.repository.js";

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export async function registerUser(
  input: RegisterUserInput,
): Promise<RegisteredUser> {
  const passwordHash = await argon2.hash(input.password);

  const user = await createUser({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  return user;
}

