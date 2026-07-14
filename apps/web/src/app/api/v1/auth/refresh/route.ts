import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { verifyRefreshToken, signAccessToken } from "@/lib/jwt";
import { jsonError } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const refreshToken = body?.refreshToken as string | undefined;
    if (!refreshToken) {
      return jsonError("Refresh token gerekli", 400);
    }

    const payload = await verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { store: true },
    });

    if (!user) {
      return jsonError("Yetkisiz erişim", 401);
    }

    const token = await signAccessToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      storeId: user.storeId,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        storeId: user.storeId,
        storeName: user.store?.name ?? null,
      },
    });
  } catch {
    return jsonError("Oturum süresi doldu", 401);
  }
}
