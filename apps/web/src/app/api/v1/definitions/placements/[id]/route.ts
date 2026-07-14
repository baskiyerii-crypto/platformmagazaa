import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { updatePlacementOptionSchema } from "@magaza/shared";

async function getPlacementUsageCount(id: string) {
  const [videos, signage] = await Promise.all([
    prisma.avmVideo.count({ where: { placementId: id } }),
    prisma.storeSignageEntry.count({ where: { placementId: id } }),
  ]);
  return videos + signage;
}

export const PATCH = withAuthParams<{ id: string }>(
  async (request, _auth, context) => {
    const { id } = await context.params;
    const existing = await prisma.placementOption.findUnique({ where: { id } });
    if (!existing) return jsonError("Konum bulunamadı", 404);

    const body = await request.json();
    const parsed = updatePlacementOptionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    try {
      const item = await prisma.placementOption.update({
        where: { id },
        data: parsed.data,
      });
      return NextResponse.json(item);
    } catch {
      return jsonError("Bu kod zaten kullanılıyor", 409);
    }
  },
  { adminOnly: true }
);

export const DELETE = withAuthParams<{ id: string }>(
  async (_request, _auth, context) => {
    const { id } = await context.params;
    const existing = await prisma.placementOption.findUnique({ where: { id } });
    if (!existing) return jsonError("Konum bulunamadı", 404);

    const usage = await getPlacementUsageCount(id);
    if (usage > 0) {
      return jsonError("Bu konum envanter kayıtlarında kullanılıyor, silinemez", 409);
    }

    await prisma.placementOption.delete({ where: { id } });
    return NextResponse.json({ success: true });
  },
  { adminOnly: true }
);
