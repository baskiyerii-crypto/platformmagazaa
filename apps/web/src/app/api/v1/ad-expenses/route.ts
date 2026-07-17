import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import { createAdExpensesSchema, isStaffRole } from "@magaza/shared";
import {
  listAdExpenses,
  serializeExpense,
  summarizeAdExpenses,
  type AdExpenseFilters,
  expenseInclude,
} from "@/lib/ad-expenses";

function filtersFromSearch(searchParams: URLSearchParams, forceStoreId?: string | null): AdExpenseFilters {
  return {
    storeId: forceStoreId || searchParams.get("storeId") || undefined,
    categoryId: searchParams.get("categoryId") || undefined,
    announcementId: searchParams.get("announcementId") || undefined,
    catalogCampaignId: searchParams.get("catalogCampaignId") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    period: (searchParams.get("period") as AdExpenseFilters["period"]) || undefined,
    link: (searchParams.get("link") as AdExpenseFilters["link"]) || "all",
  };
}

function dbError(e: unknown) {
  const msg = e instanceof Error ? e.message : "Veritabanı hatası";
  const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
  if (
    code === "P2021" ||
    code === "P2022" ||
    /does not exist|Unknown arg|AnnouncementKind|AdExpense|column .* does not exist/i.test(msg)
  ) {
    return jsonError(
      "Veritabanı şeması güncel değil. Coolify’da yeniden deploy edin (entrypoint prisma db push) veya production DATABASE_URL ile `pnpm --filter @magaza/database push` çalıştırın.",
      503
    );
  }
  console.error("[ad-expenses]", e);
  return jsonError(msg || "Sunucu hatası", 500);
}

async function assertCatalogCampaign(catalogCampaignId: string | null | undefined) {
  if (!catalogCampaignId) return null;
  const campaign = await prisma.catalogCampaign.findFirst({
    where: { id: catalogCampaignId, active: true },
  });
  if (!campaign) {
    throw new Error("Kampanya bulunamadı veya pasif");
  }
  return campaign;
}

/** Legacy: keep validating announcement links on old rows / rare dual posts */
async function assertCampaignAnnouncement(announcementId: string | null | undefined, storeId: string) {
  if (!announcementId) return null;
  const announcement = await prisma.announcement.findFirst({
    where: {
      id: announcementId,
      active: true,
      kind: "KAMPANYA",
      OR: [
        { audience: "ALL_STORES" },
        { audience: "SELECTED_STORES", storeIds: { has: storeId } },
      ],
    },
  });
  if (!announcement) {
    throw new Error("Kampanya duyurusu bulunamadı veya bu mağaza için geçerli değil");
  }
  return announcement;
}

export const GET = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const staff = isStaffRole(auth.role);
    if (!staff && !auth.storeId) {
      return jsonError("Mağaza bilgisi eksik", 403);
    }

    const filters = filtersFromSearch(searchParams, staff ? undefined : auth.storeId);
    if (searchParams.get("summary") === "1") {
      if (!staff) return jsonError("Özet sadece yönetici için", 403);
      const summary = await summarizeAdExpenses(filters);
      return NextResponse.json(summary);
    }

    if (searchParams.get("campaigns") === "1") {
      const campaigns = await prisma.catalogCampaign.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          mode: true,
          startsAt: true,
          endsAt: true,
          description: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
      // UI expects { id, title } — map name → title for dropdown compatibility
      return NextResponse.json(
        campaigns.map((c) => ({
          id: c.id,
          title: c.name,
          name: c.name,
          mode: c.mode,
          startsAt: c.startsAt,
          endsAt: c.endsAt,
          description: c.description,
        }))
      );
    }

    const items = await listAdExpenses(filters);
    return NextResponse.json(items);
  } catch (e) {
    return dbError(e);
  }
});

export const POST = withAuth(async (request, auth) => {
  try {
    const staff = isStaffRole(auth.role);
    const body = await request.json();
    const parsed = createAdExpensesSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    let storeId = auth.storeId ?? null;
    if (staff && body.storeId) {
      storeId = body.storeId;
    }
    if (!storeId) {
      return jsonError("Mağaza gerekli", 400);
    }

    if (!staff && storeId !== auth.storeId) {
      return jsonError("Başka mağaza adına gider giremezsiniz", 403);
    }

    const categoryIds = [...new Set(parsed.data.items.map((i) => i.categoryId))];
    const cats = await prisma.adExpenseCategory.findMany({
      where: { id: { in: categoryIds }, active: true },
      select: { id: true },
    });
    if (cats.length !== categoryIds.length) {
      return jsonError("Geçersiz veya pasif kategori", 400);
    }

    for (const line of parsed.data.items) {
      await assertCatalogCampaign(line.catalogCampaignId);
      if (line.announcementId) {
        await assertCampaignAnnouncement(line.announcementId, storeId);
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const rows = [];
      for (const line of parsed.data.items) {
        const row = await tx.adExpense.create({
          data: {
            storeId,
            categoryId: line.categoryId,
            catalogCampaignId: line.catalogCampaignId || null,
            // New entries use catalog campaigns; do not mix unless explicitly sent
            announcementId: line.catalogCampaignId ? null : line.announcementId || null,
            title: line.title,
            quantity: line.quantity,
            totalPrice: line.totalPrice,
            expenseDate: new Date(line.expenseDate),
            note: line.note || null,
            createdById: auth.userId,
          },
          include: expenseInclude,
        });
        rows.push(row);
      }
      return rows;
    });

    return NextResponse.json(created.map(serializeExpense), { status: 201 });
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message.includes("Kampanya duyurusu") || e.message.includes("Kampanya bulunamadı"))
    ) {
      return jsonError(e.message, 400);
    }
    return dbError(e);
  }
});
