
import { describe, expect, it } from "vitest";
import { registerSchema } from "../src/modules/auth/auth.validation.js";

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

  it("rejects a password shorter than 12 characters", () => {
    const result = registerSchema.safeParse({
      name: "Keshav",
      email: "keshav@example.com",
      password: "123",
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
