import { SignJWT, jwtVerify } from "jose";
import { pool } from "../config/database.js";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be configured with at least 32 characters");
}

const secret = new TextEncoder().encode(jwtSecret);
const JWT_ISSUER = "collabspace-api";
const ACCESS_TOKEN_LIFETIME = "15m";

export async function createAccessToken(
  userId: string,
  tokenVersion = 0,
): Promise<string> {
  return new SignJWT({ ver: tokenVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_LIFETIME)
    .sign(secret);
}

/** Verify signature, issuer, expiry, subject and current account token version. */
export async function verifyAccessToken(
  token: string,
): Promise<{ userId: string }> {
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

  return { userId: payload.sub };
}
