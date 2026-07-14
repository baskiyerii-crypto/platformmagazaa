import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { updateAreaSubTypeSchema } from "@magaza/shared";

async function getSubTypeUsageCount(id: string) {
  const [avm, outdoor, signage] = await Promise.all([
    prisma.avmEntry.count({ where: { subTypeId: id } }),
    prisma.outdoorEntry.count({ where: { subTypeId: id } }),
    prisma.storeSignageEntry.count({ where: { subTypeId: id } }),
  ]);
  return avm + outdoor + signage;
}

export const PATCH = withAuthParams<{ id: string }>(
  async (request, _auth, context) => {
    const { id } = await context.params;
    const existing = await prisma.areaSubType.findUnique({ where: { id } });
    if (!existing) return jsonError("Tür bulunamadı", 404);

    const body = await request.json();
    const parsed = updateAreaSubTypeSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    try {
      const item = await prisma.areaSubType.update({
        where: { id },
        data: parsed.data,
      });
      return NextResponse.json(item);
    } catch {
      return jsonError("Bu kod bu kategoride zaten kullanılıyor", 409);
    }
  },
  { adminOnly: true }
);

export const DELETE = withAuthParams<{ id: string }>(
  async (_request, _auth, context) => {
    const { id } = await context.params;
    const existing = await prisma.areaSubType.findUnique({ where: { id } });
    if (!existing) return jsonError("Tür bulunamadı", 404);

    const usage = await getSubTypeUsageCount(id);
    if (usage > 0) {
      return jsonError("Bu tür envanter kayıtlarında kullanılıyor, silinemez", 409);
    }

    await prisma.areaSubType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  },
  { adminOnly: true }
);
