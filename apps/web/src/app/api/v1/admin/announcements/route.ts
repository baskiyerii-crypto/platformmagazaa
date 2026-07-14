import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import { createAnnouncementSchema } from "@magaza/shared";
import { notifyStoreUsers, notifyUsers } from "@/lib/notify";

export const GET = withAuth(
  async () => {
    const items = await prisma.announcement.findMany({
      include: {
        createdBy: { select: { username: true } },
        receipts: {
          include: { store: { select: { id: true, name: true } } },
          orderBy: { store: { name: "asc" } },
        },
      },
      orderBy: { publishedAt: "desc" },
    });

    const allStores = await prisma.store.findMany({
      where: { active: true },
      select: { id: true },
    });

    for (const item of items) {
      const targetIds =
        item.audience === "ALL_STORES"
          ? allStores.map((s) => s.id)
          : item.storeIds;

      const existing = new Set(item.receipts.map((r) => r.storeId));
      const missing = targetIds.filter((id) => !existing.has(id));
      if (missing.length) {
        await prisma.announcementReceipt.createMany({
          data: missing.map((storeId) => ({
            announcementId: item.id,
            storeId,
            status: "BEKLIYOR",
          })),
          skipDuplicates: true,
        });
      }
    }

    const refreshed = await prisma.announcement.findMany({
      include: {
        createdBy: { select: { username: true } },
        receipts: {
          include: { store: { select: { id: true, name: true } } },
          orderBy: { store: { name: "asc" } },
        },
      },
      orderBy: { publishedAt: "desc" },
    });

    return NextResponse.json(refreshed);
  },
  { adminOnly: true }
);

export const POST = withAuth(
  async (request, auth) => {
    const body = await request.json();
    const parsed = createAnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    if (parsed.data.audience === "SELECTED_STORES" && !parsed.data.storeIds.length) {
      return jsonError("En az bir mağaza seçin", 400);
    }

    const targetStores =
      parsed.data.audience === "ALL_STORES"
        ? await prisma.store.findMany({ where: { active: true }, select: { id: true } })
        : parsed.data.storeIds.map((id) => ({ id }));

    const announcement = await prisma.$transaction(async (tx) => {
      const created = await tx.announcement.create({
        data: {
          title: parsed.data.title,
          body: parsed.data.body,
          audience: parsed.data.audience,
          storeIds: parsed.data.storeIds,
          attachments: parsed.data.attachments ?? undefined,
          expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
          active: parsed.data.active,
          createdById: auth.userId,
        },
      });

      if (targetStores.length) {
        await tx.announcementReceipt.createMany({
          data: targetStores.map((s) => ({
            announcementId: created.id,
            storeId: s.id,
            status: "BEKLIYOR",
          })),
        });
      }

      return created;
    });

    if (parsed.data.audience === "ALL_STORES") {
      const storeUsers = await prisma.user.findMany({
        where: { role: "STORE", storeId: { not: null } },
        select: { id: true },
      });
      await notifyUsers(storeUsers.map((u) => u.id), {
        type: "ANNOUNCEMENT",
        title: "Yeni Duyuru",
        body: parsed.data.title,
        linkUrl: "/store/announcements",
      });
    } else {
      for (const storeId of parsed.data.storeIds) {
        await notifyStoreUsers(storeId, {
          type: "ANNOUNCEMENT",
          title: "Yeni Duyuru",
          body: parsed.data.title,
          linkUrl: "/store/announcements",
        });
      }
    }

    return NextResponse.json(announcement, { status: 201 });
  },
  { strictAdminOnly: true }
);
