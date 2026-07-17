import { Prisma } from "@magaza/database";
import { prisma } from "@magaza/database";

export type AdExpenseFilters = {
  storeId?: string;
  categoryId?: string;
  announcementId?: string;
  catalogCampaignId?: string;
  dateFrom?: string;
  dateTo?: string;
  period?: "day" | "month" | "year";
  /** only campaign-linked / only general / all */
  link?: "campaign" | "general" | "all";
  active?: boolean;
};

function parseDayStart(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDayEnd(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

/** period=day|month|year narrows around "today" unless dateFrom/dateTo provided */
export function resolveDateRange(filters: AdExpenseFilters): { gte?: Date; lte?: Date } {
  if (filters.dateFrom || filters.dateTo) {
    return {
      gte: filters.dateFrom ? parseDayStart(filters.dateFrom) ?? undefined : undefined,
      lte: filters.dateTo ? parseDayEnd(filters.dateTo) ?? undefined : undefined,
    };
  }

  if (!filters.period) return {};

  const now = new Date();
  const gte = new Date(now);
  gte.setHours(0, 0, 0, 0);
  const lte = new Date(now);
  lte.setHours(23, 59, 59, 999);

  if (filters.period === "month") {
    gte.setDate(1);
  } else if (filters.period === "year") {
    gte.setMonth(0, 1);
  }

  return { gte, lte };
}

export function buildAdExpenseWhere(filters: AdExpenseFilters): Prisma.AdExpenseWhereInput {
  const range = resolveDateRange(filters);
  return {
    active: filters.active === false ? undefined : true,
    ...(filters.storeId ? { storeId: filters.storeId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.catalogCampaignId
      ? { catalogCampaignId: filters.catalogCampaignId }
      : filters.announcementId
        ? { announcementId: filters.announcementId }
        : filters.link === "campaign"
          ? {
              OR: [
                { catalogCampaignId: { not: null } },
                { announcementId: { not: null } },
              ],
            }
          : filters.link === "general"
            ? { catalogCampaignId: null, announcementId: null }
            : {}),
    ...(range.gte || range.lte
      ? {
          expenseDate: {
            ...(range.gte ? { gte: range.gte } : {}),
            ...(range.lte ? { lte: range.lte } : {}),
          },
        }
      : {}),
  };
}

export function serializeExpense<T extends { totalPrice: Prisma.Decimal | number | string }>(
  row: T
): Omit<T, "totalPrice"> & { totalPrice: number } {
  return {
    ...row,
    totalPrice: Number(row.totalPrice),
  };
}

export function expenseCampaignTitle(item: {
  catalogCampaign?: { name: string } | null;
  announcement?: { title: string } | null;
  catalogCampaignId?: string | null;
  announcementId?: string | null;
}) {
  return item.catalogCampaign?.name ?? item.announcement?.title ?? "Kampanya dışı";
}

export function isExpenseCampaignLinked(item: {
  catalogCampaignId?: string | null;
  announcementId?: string | null;
}) {
  return Boolean(item.catalogCampaignId || item.announcementId);
}

const expenseInclude = {
  store: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, code: true } },
  announcement: { select: { id: true, title: true, kind: true } },
  catalogCampaign: { select: { id: true, name: true, mode: true } },
  createdBy: { select: { id: true, username: true } },
} as const;

export async function listAdExpenses(filters: AdExpenseFilters) {
  const items = await prisma.adExpense.findMany({
    where: buildAdExpenseWhere(filters),
    include: expenseInclude,
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
  });
  return items.map(serializeExpense);
}

export async function summarizeAdExpenses(filters: AdExpenseFilters) {
  const items = await listAdExpenses(filters);
  const byCampaignStore = new Map<
    string,
    {
      catalogCampaignId: string | null;
      announcementId: string | null;
      campaignTitle: string;
      announcementTitle: string;
      storeId: string;
      storeName: string;
      total: number;
      count: number;
    }
  >();
  let grandTotal = 0;

  for (const item of items) {
    grandTotal += item.totalPrice;
    const campaignKey = item.catalogCampaignId ?? item.announcementId ?? "none";
    const key = `${campaignKey}:${item.storeId}`;
    const title = expenseCampaignTitle(item);
    const prev = byCampaignStore.get(key);
    if (prev) {
      prev.total += item.totalPrice;
      prev.count += 1;
    } else {
      byCampaignStore.set(key, {
        catalogCampaignId: item.catalogCampaignId,
        announcementId: item.announcementId,
        campaignTitle: title,
        announcementTitle: title,
        storeId: item.storeId,
        storeName: item.store.name,
        total: item.totalPrice,
        count: 1,
      });
    }
  }

  return {
    grandTotal,
    count: items.length,
    byCampaignStore: Array.from(byCampaignStore.values()).sort((a, b) => b.total - a.total),
  };
}

export { expenseInclude };
