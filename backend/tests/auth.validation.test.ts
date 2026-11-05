
import { describe, expect, it } from "vitest";
import { registerSchema, loginSchema, changePasswordSchema } from "../src/modules/auth/auth.validation.js";

describe("registerSchema", () => {
  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse({
      name: "Keshav",
      email: "keshav@example.com",
      password: "MySecurePassword123!",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      name: "Keshav",
      email: "not-an-email",
      password: "MySecurePassword123!",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      name: "Keshav",
      email: "keshav@example.com",
      password: "1234567",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a name containing only whitespace", () => {
    const result = registerSchema.safeParse({
      name: "   ",
      email: "keshav@example.com",
      password: "MySecurePassword123!",
    });

    expect(result.success).toBe(false);
  });

  it("trims whitespace from the name and email", () => {
    const result = registerSchema.safeParse({
      name: "  Keshav  ",
      email: "  keshav@example.com  ",
      password: "MySecurePassword123!",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.name).toBe("Keshav");
      expect(result.data.email).toBe("keshav@example.com");
    }
  });
});

describe("loginSchema", () => {
  it("accepts valid login data", () => {
    expect(loginSchema.safeParse({ email: "person@example.com", password: "password123" }).success).toBe(true);
  });

  it("rejects malformed email addresses", () => {
    expect(loginSchema.safeParse({ email: "invalid", password: "password123" }).success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("requires a different new password with sufficient length", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "old-password", newPassword: "new-password" }).success).toBe(true);
    expect(changePasswordSchema.safeParse({ currentPassword: "same-password", newPassword: "same-password" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: "old-password", newPassword: "short" }).success).toBe(false);
  });
});
