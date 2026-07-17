import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isStaffRole } from "@magaza/shared";

function useSecureCookies() {
  const url = process.env.NEXTAUTH_URL?.trim() ?? "";
  if (url.startsWith("https://")) return true;
  // Production behind Coolify TLS — always prefer secure cookie name
  if (process.env.NODE_ENV === "production") return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const rawSecret =
    process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  const secret = rawSecret?.replace(/^["']|["']$/g, "");

  if (!secret && process.env.NODE_ENV === "production") {
    console.error(
      "[middleware] Missing NEXTAUTH_SECRET/AUTH_SECRET — session tokens cannot be verified"
    );
  }

  const secureCookie = useSecureCookies();
  const token = await getToken({
    req: request,
    secret,
    secureCookie,
  });

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
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
  matcher: ["/admin/:path*", "/store/:path*", "/login", "/register"],
};
