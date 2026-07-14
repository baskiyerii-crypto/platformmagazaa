import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyAccessToken, type JwtPayload } from "@/lib/jwt";
import type { UserRole } from "@magaza/database";
import { isStaffRole, isAdminRole } from "@magaza/shared";

export type AuthContext = {
  userId: string;
  username: string;
  role: UserRole;
  storeId?: string | null;
};

export async function getAuthFromRequest(
  request: NextRequest
): Promise<AuthContext | null> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const payload = await verifyAccessToken(token);
      return {
        userId: payload.sub,
        username: payload.username,
        role: payload.role,
        storeId: payload.storeId,
      };
    } catch {
      return null;
    }
  }

  const session = await getServerSession(authOptions);
  if (session?.user) {
    return {
      userId: session.user.id,
      username: session.user.username,
      role: session.user.role,
      storeId: session.user.storeId,
    };
  }

  return null;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function requireAuth(auth: AuthContext | null): auth is AuthContext {
  return auth !== null;
}

export function requireAdmin(auth: AuthContext) {
  return isStaffRole(auth.role);
}

export function requireStrictAdmin(auth: AuthContext) {
  return isAdminRole(auth.role);
}

async function authorize(
  request: NextRequest,
  options?: { adminOnly?: boolean; strictAdminOnly?: boolean }
): Promise<AuthContext | NextResponse> {
  const auth = await getAuthFromRequest(request);
  if (!requireAuth(auth)) {
    return jsonError("Yetkisiz erişim", 401);
  }
  if (options?.strictAdminOnly && !requireStrictAdmin(auth)) {
    return jsonError("Ana yönetici yetkisi gerekli", 403);
  }
  if (options?.adminOnly && !requireAdmin(auth)) {
    return jsonError("Admin yetkisi gerekli", 403);
  }
  return auth;
}

export function withAuth(
  handler: (request: NextRequest, auth: AuthContext) => Promise<NextResponse>,
  options?: { adminOnly?: boolean; strictAdminOnly?: boolean }
) {
  return async (request: NextRequest) => {
    const authResult = await authorize(request, options);
    if (authResult instanceof NextResponse) return authResult;
    return handler(request, authResult);
  };
}

export function withAuthParams<T extends Record<string, string>>(
  handler: (
    request: NextRequest,
    auth: AuthContext,
    context: { params: Promise<T> }
  ) => Promise<NextResponse>,
  options?: { adminOnly?: boolean; strictAdminOnly?: boolean }
) {
  return async (
    request: NextRequest,
    context: { params: Promise<T> }
  ) => {
    const authResult = await authorize(request, options);
    if (authResult instanceof NextResponse) return authResult;
    return handler(request, authResult, context);
  };
}
