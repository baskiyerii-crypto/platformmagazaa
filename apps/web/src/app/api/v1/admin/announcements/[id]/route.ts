import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { updateAnnouncementSchema } from "@magaza/shared";

async function syncReceiptsForAnnouncement(
  announcementId: string,
  audience: "ALL_STORES" | "SELECTED_STORES",
  storeIds: string[]
) {
  const targetIds =
    audience === "ALL_STORES"
      ? (
          await prisma.store.findMany({
            where: { active: true },
            select: { id: true },
          })
        ).map((s) => s.id)
      : storeIds;

  const existing = await prisma.announcementReceipt.findMany({
    where: { announcementId },
    select: { storeId: true },
  });
  const existingSet = new Set(existing.map((r) => r.storeId));
  const missing = targetIds.filter((id) => !existingSet.has(id));
  if (missing.length) {
    await prisma.announcementReceipt.createMany({
      data: missing.map((storeId) => ({
        announcementId,
        storeId,
        status: "BEKLIYOR",
      })),
      skipDuplicates: true,
    });
  }
}

export const PATCH = withAuthParams<{ id: string }>(
  async (request, _auth, context) => {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateAnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return jsonError("Duyuru bulunamadı", 404);

    const audience = parsed.data.audience ?? existing.audience;
    const storeIds = parsed.data.storeIds ?? existing.storeIds;

    if (audience === "SELECTED_STORES" && !storeIds.length) {
      return jsonError("En az bir mağaza seçin", 400);
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.body !== undefined ? { body: parsed.data.body } : {}),
        ...(parsed.data.kind !== undefined ? { kind: parsed.data.kind } : {}),
        ...(parsed.data.audience !== undefined ? { audience: parsed.data.audience } : {}),
        ...(parsed.data.storeIds !== undefined ? { storeIds: parsed.data.storeIds } : {}),
        ...(parsed.data.attachments !== undefined
          ? { attachments: parsed.data.attachments }
          : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
        expiresAt:
          parsed.data.expiresAt === undefined
            ? undefined
            : parsed.data.expiresAt
              ? new Date(parsed.data.expiresAt)
              : null,
      },
    });

    if (
      parsed.data.audience !== undefined ||
      parsed.data.storeIds !== undefined
    ) {
      await syncReceiptsForAnnouncement(id, audience, storeIds);
    }

    return NextResponse.json(announcement);
  },
  { strictAdminOnly: true }
);

export const DELETE = withAuthParams<{ id: string }>(
  async (_request, _auth, context) => {
    const { id } = await context.params;
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return jsonError("Duyuru bulunamadı", 404);
    await prisma.announcement.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ success: true });
  },
  { strictAdminOnly: true }
);
