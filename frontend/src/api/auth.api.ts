
import { apiRequest, setAccessToken, clearAccessToken } from "./client";

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthResponse {
  status: "success";
  message: string;
  data: {
    user: User & {
      accessToken: string;
    };
  };
}

export interface AuthenticatedUser {
  user: User;
  accessToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

function handleAuthResponse(response: AuthResponse): AuthenticatedUser {
  const { accessToken, ...user } = response.data.user;

  setAccessToken(accessToken);

  return {
    user,
    accessToken,
  };
}

export async function login(input: LoginInput): Promise<AuthenticatedUser> {
  const response = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return handleAuthResponse(response);
}

export async function register(
  input: RegisterInput,
): Promise<AuthenticatedUser> {
  const response = await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return handleAuthResponse(response);
}

export function logout(): void {
  clearAccessToken();
}


interface CurrentUserResponse {
  status: "success";
  message: string;
  data: {
    user: User;
  };
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiRequest<CurrentUserResponse>(
    "/protected/me",
  );

  return response.data.user;
}


export async function updateProfile(input: Pick<User, "name" | "email">): Promise<User> {
  const response = await apiRequest<{ status: string; data: { user: User } }>("/protected/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.data.user;
}

export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  await apiRequest<unknown>("/protected/me/password", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
