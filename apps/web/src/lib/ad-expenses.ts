import { Prisma } from "@magaza/database";
import { prisma } from "@magaza/database";

export type AdExpenseFilters = {
  storeId?: string;
  categoryId?: string;
  announcementId?: string;
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
    ...(filters.announcementId
      ? { announcementId: filters.announcementId }
      : filters.link === "campaign"
        ? { announcementId: { not: null } }
        : filters.link === "general"
          ? { announcementId: null }
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

const expenseInclude = {
  store: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, code: true } },
  announcement: { select: { id: true, title: true, kind: true } },
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
    { announcementId: string | null; announcementTitle: string; storeId: string; storeName: string; total: number; count: number }
  >();
  let grandTotal = 0;

  for (const item of items) {
    grandTotal += item.totalPrice;
    const key = `${item.announcementId ?? "none"}:${item.storeId}`;
    const prev = byCampaignStore.get(key);
    if (prev) {
      prev.total += item.totalPrice;
      prev.count += 1;
    } else {
      byCampaignStore.set(key, {
        announcementId: item.announcementId,
        announcementTitle: item.announcement?.title ?? "Kampanya dışı",
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
