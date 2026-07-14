import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { resetStoreUserPasswordSchema } from "@magaza/shared";
import bcrypt from "bcryptjs";

export const DELETE = withAuthParams<{ id: string; userId: string }>(
  async (_request, _auth, context) => {
    const { id: storeId, userId } = await context.params;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.storeId !== storeId) {
      return jsonError("Kullanıcı bulunamadı", 404);
    }
    if (user.role !== "STORE") {
      return jsonError("Sadece mağaza kullanıcıları silinebilir", 400);
    }
    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  },
  { strictAdminOnly: true }
);

export const PATCH = withAuthParams<{ id: string; userId: string }>(
  async (request, _auth, context) => {
    const { id: storeId, userId } = await context.params;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.storeId !== storeId) {
      return jsonError("Kullanıcı bulunamadı", 404);
    }

    const body = await request.json();
    const parsed = resetStoreUserPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return NextResponse.json({ success: true });
  },
  { strictAdminOnly: true }
);
