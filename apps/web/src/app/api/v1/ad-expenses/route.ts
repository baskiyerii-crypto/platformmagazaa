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
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    period: (searchParams.get("period") as AdExpenseFilters["period"]) || undefined,
    link: (searchParams.get("link") as AdExpenseFilters["link"]) || "all",
  };
}

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

  // Kampanya listesi (dropdown)
  if (searchParams.get("campaigns") === "1") {
    const storeId = staff ? searchParams.get("storeId") : auth.storeId;
    const campaigns = await prisma.announcement.findMany({
      where: {
        active: true,
        kind: "KAMPANYA",
        ...(storeId
          ? {
              OR: [
                { audience: "ALL_STORES" },
                { audience: "SELECTED_STORES", storeIds: { has: storeId } },
              ],
            }
          : {}),
      },
      select: { id: true, title: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
    });
    return NextResponse.json(campaigns);
  }

  const items = await listAdExpenses(filters);
  return NextResponse.json(items);
});

export const POST = withAuth(async (request, auth) => {
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

  try {
    for (const line of parsed.data.items) {
      await assertCampaignAnnouncement(line.announcementId, storeId);
    }
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Kampanya hatası", 400);
  }

  const created = await prisma.$transaction(
    async (tx) => {
      const rows = [];
      for (const line of parsed.data.items) {
        const row = await tx.adExpense.create({
          data: {
            storeId,
            categoryId: line.categoryId,
            announcementId: line.announcementId || null,
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
    }
  );

  return NextResponse.json(created.map(serializeExpense), { status: 201 });
});
