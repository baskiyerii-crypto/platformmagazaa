import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isStaffRole } from "@magaza/shared";

export async function middleware(request: NextRequest) {
  const rawSecret =
    process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  const secret = rawSecret?.replace(/^["']|["']$/g, "");

  const token = await getToken({
    req: request,
    secret,
  });

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith("/login");
  const isProtected = pathname.startsWith("/admin") || pathname.startsWith("/store");

  if (!token && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isAuthPage) {
    const dest = isStaffRole(token.role as "ADMIN" | "MANAGER" | "STORE")
      ? "/admin"
      : "/store";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/store/:path*", "/login"],
};
