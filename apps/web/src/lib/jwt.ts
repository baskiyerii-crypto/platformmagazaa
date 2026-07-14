import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@magaza/database";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-jwt-secret"
);
const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET ?? "dev-jwt-refresh-secret"
);

export type JwtPayload = {
  sub: string;
  username: string;
  role: UserRole;
  storeId?: string | null;
};

export async function signAccessToken(payload: JwtPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(JWT_SECRET);
}

export async function signRefreshToken(payload: JwtPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_REFRESH_SECRET);
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as unknown as JwtPayload & { sub: string };
}

export async function verifyRefreshToken(token: string) {
  const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
  return payload as unknown as JwtPayload & { sub: string };
}
