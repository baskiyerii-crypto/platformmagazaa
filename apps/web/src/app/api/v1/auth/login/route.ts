import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@magaza/database";
import { loginSchema } from "@magaza/shared";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { jsonError } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz giriş", 400);
    }

    const user = await prisma.user.findUnique({
      where: { username: parsed.data.username },
      include: { store: true },
    });

    if (!user) {
      return jsonError("Kullanıcı adı veya şifre hatalı", 401);
    }

    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) {
      return jsonError("Kullanıcı adı veya şifre hatalı", 401);
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      storeId: user.storeId,
    };

    const token = await signAccessToken(payload);
    const refreshToken = await signRefreshToken(payload);

    return NextResponse.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        storeId: user.storeId,
        storeName: user.store?.name ?? null,
      },
    });
  } catch {
    return jsonError("Giriş işlemi başarısız", 500);
  }
}
