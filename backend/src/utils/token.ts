import { SignJWT, jwtVerify } from "jose";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET is not configured");
}

const secret = new TextEncoder().encode(jwtSecret);

const JWT_ISSUER = "collabspace-api";
const ACCESS_TOKEN_LIFETIME = "15m";

export async function createAccessToken( userId: string,): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
    })
    .setSubject(userId)
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_LIFETIME)
    .sign(secret);
}

export async function verifyAccessToken(
  token: string,
): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
  });

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("Invalid token subject");
  }

  return {
    userId: payload.sub,
  };
}