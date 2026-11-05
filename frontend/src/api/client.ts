
const API_BASE_URL = "/api";

export const AUTH_EXPIRED_EVENT = "collabspace:auth-expired";

const TOKEN_KEY = "collabspace_access_token";

// Store the access token after successful login.
export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

// Retrieve the stored access token.
export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Remove the token during logout.
export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Custom error class for API errors.
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Reusable function for communicating with our backend.
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();

  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle responses that don't contain a body.
  if (response.status === 204) {
    return undefined as T;
  }

  const responseData = await response.json().catch(() => null);

  if (response.status === 401 && token) {
    // The saved token is no longer valid; let the app log the user out.
    clearAccessToken();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }

  if (!response.ok) {
    const validationDetails = Array.isArray(responseData?.errors)
      ? responseData.errors
          .map((item: { field?: string; message?: string }) =>
            [item.field, item.message].filter(Boolean).join(": "),
          )
          .filter(Boolean)
          .join("; ")
      : "";
    const message =
      validationDetails || responseData?.message ||
      "Something went wrong. Please try again.";

    throw new ApiError(message, response.status);
  }

  return responseData as T;
}
