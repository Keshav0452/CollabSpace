import { SignJWT, jwtVerify } from "jose";
import { pool } from "../config/database.js";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be configured with at least 32 characters");
}

const secret = new TextEncoder().encode(jwtSecret);
const JWT_ISSUER = "collabspace-api";
// Tokens last ACCESS_TOKEN_TTL_HOURS (default 24). While a user stays active,
// the API hands out a fresh token once half of the lifetime has passed, so
// active users are never logged out mid-session. A password change still
// revokes every older token immediately (see the token_version check below).
const ttlHours = Number(process.env.ACCESS_TOKEN_TTL_HOURS ?? 24);

if (!Number.isFinite(ttlHours) || ttlHours <= 0) {
  throw new Error("ACCESS_TOKEN_TTL_HOURS must be a positive number");
}

export const ACCESS_TOKEN_TTL_SECONDS = Math.round(ttlHours * 3600);

export async function createAccessToken(
  userId: string,
  tokenVersion = 0,
): Promise<string> {
  return new SignJWT({ ver: tokenVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

/** Verify signature, issuer, expiry, subject and current account token version. */
export async function verifyAccessToken(
  token: string,
): Promise<{ userId: string; tokenVersion: number; expiresAt: number }> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
  });

  if (
    typeof payload.sub !== "string" ||
    payload.sub.length === 0 ||
    typeof payload.ver !== "number" ||
    !Number.isInteger(payload.ver)
  ) {
    throw new Error("Invalid access token claims");
  }

  const result = await pool.query<{ tokenVersion: number }>(
    `SELECT token_version AS "tokenVersion" FROM public.users WHERE id = $1 LIMIT 1`,
    [payload.sub],
  );
  const currentVersion = result.rows[0]?.tokenVersion;

  if (currentVersion === undefined || currentVersion !== payload.ver) {
    throw new Error("Access token has been revoked");
  }

  return {
    userId: payload.sub,
    tokenVersion: payload.ver,
    expiresAt: typeof payload.exp === "number" ? payload.exp : 0,
  };
}
