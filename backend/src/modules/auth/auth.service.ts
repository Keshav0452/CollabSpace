import argon2 from "argon2";
import { createUser, findUserByEmail } from "./auth.repository.js";
import type {LoginUserInput,RegisterUserInput,} from "./auth.validation.js";
import { AppError } from "../../utils/app-error.js";
import { createAccessToken } from "../../utils/token.js";

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export async function registerUser(input: RegisterUserInput,): Promise<RegisteredUser> {
  const passwordHash = await argon2.hash(input.password);

  try {
    const user = await createUser({
      name: input.name,
      email: input.email,
      passwordHash,
    });

    return user;
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      "constraint" in error &&
      error.code === "23505" &&
      error.constraint === "users_email_key"

    ) {
      throw new AppError(
        409,
        "An account with this email already exists",
      );
    }

    throw error;
  }
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
}

export async function loginUser(
  input: LoginUserInput,
): Promise<AuthenticatedUser & { accessToken: string }> {
  const user = await findUserByEmail(input.email);

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const isPasswordValid = await argon2.verify(
    user.passwordHash,
    input.password,
  );

  if (!isPasswordValid) {
    throw new AppError(401, "Invalid email or password");
  }

  const accessToken = await createAccessToken(user.id);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    accessToken,
  };
}