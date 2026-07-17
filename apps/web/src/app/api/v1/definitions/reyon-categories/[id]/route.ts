import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { updateReyonCategorySchema } from "@magaza/shared";

export const PATCH = withAuthParams<{ id: string }>(
  async (request, _auth, context) => {
    const { id } = await context.params;
    const existing = await prisma.reyonCategory.findUnique({ where: { id } });
    if (!existing) return jsonError("Reyon kategorisi bulunamadı", 404);

    const parsed = updateReyonCategorySchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    try {
      const item = await prisma.reyonCategory.update({
        where: { id },
        data: parsed.data,
      });
      return NextResponse.json(item);
    } catch {
      return jsonError("Bu reyon kategori kodu zaten kullanılıyor", 409);
    }
  },
  { adminOnly: true }
);

export const DELETE = withAuthParams<{ id: string }>(
  async (_request, _auth, context) => {
    const { id } = await context.params;
    const existing = await prisma.reyonCategory.findUnique({ where: { id } });
    if (!existing) return jsonError("Reyon kategorisi bulunamadı", 404);

    const usage = await prisma.storeSignageEntry.count({
      where: { reyonCategoryId: id },
    });
    if (usage > 0) {
      return jsonError(
        "Bu reyon kategorisi mağaza içi envanter kayıtlarında kullanılıyor, silinemez",
        409
      );
    }

    await prisma.reyonCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  },
  { adminOnly: true }
);
