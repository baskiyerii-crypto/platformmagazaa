import ExcelJS from "exceljs";
import { prisma, ChangeRequestStatus, ChangeTargetType } from "@magaza/database";
import {
  CHANGE_REQUEST_STATUS_LABELS,
  CHANGE_TARGET_TYPE_LABELS,
  changeTargetTypeLabel,
} from "@magaza/shared";
import { resolveChangeRequestTargets } from "@/lib/server/resolve-change-request-target";
import {
  groupSizesWithTolerance,
  SIZE_TOLERANCE_CM,
  type SizeGroup,
  type SizeInput,
} from "@/lib/size-groups";
import { endOfDay, startOfDay } from "@/lib/catalog-campaign";

export type RequestsExportFilters = {
  status?: string;
  storeId?: string;
  targetType?: string;
  campaignId?: string;
  categoryId?: string;
  scope?: "product" | "campaign";
  dateFrom?: string;
  dateTo?: string;
  /** visual | catalog | all — default all */
  tab?: string;
};

function styleHeader(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
}

function dateFilter(dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) return undefined;
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (dateFrom) createdAt.gte = startOfDay(new Date(dateFrom));
  if (dateTo) createdAt.lte = endOfDay(new Date(dateTo));
  return createdAt;
}

export function addSizeSummarySheet(
  workbook: ExcelJS.Workbook,
  groups: SizeGroup[],
  titleNote?: string
) {
  const sheet = workbook.addWorksheet("Ölçü Özeti");
  sheet.columns = [
    { header: "Ölçü / Konum", key: "olcu", width: 36 },
    { header: "En (cm)", key: "en", width: 12 },
    { header: "Boy (cm)", key: "boy", width: 12 },
    { header: "Adet", key: "adet", width: 12 },
    { header: "Kayıt", key: "kayit", width: 10 },
  ];
  styleHeader(sheet);

  if (titleNote) {
    sheet.insertRow(1, [
      `Tolerans ±${SIZE_TOLERANCE_CM} cm · konum kırılımlı · ${titleNote}`,
    ]);
    sheet.mergeCells(1, 1, 1, 5);
    sheet.getRow(1).font = { italic: true, size: 10 };
    const header = sheet.getRow(2);
    header.font = { bold: true };
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
  }

  for (const g of groups) {
    const sizeRow = sheet.addRow({
      olcu: `${g.label} cm`,
      en: g.en,
      boy: g.boy,
      adet: g.toplamAdet,
      kayit: g.kayitSayisi,
    });
    sizeRow.font = { bold: true };
    for (const k of g.konumlar ?? []) {
      sheet.addRow({
        olcu: `  · ${k.konum}`,
        en: "",
        boy: "",
        adet: k.toplamAdet,
        kayit: k.kayitSayisi,
      });
    }
  }

  sheet.addRow({});
  sheet.addRow({
    olcu: "Toplam farklı ölçü",
    adet: groups.length,
  });
  sheet.addRow({
    olcu: "Toplam adet",
    adet: groups.reduce((s, g) => s + g.toplamAdet, 0),
  });
}

async function fetchAllChangeRequests(where: Record<string, unknown>) {
  const pageSize = 1000;
  const all = [];
  for (let skip = 0; ; skip += pageSize) {
    const batch = await prisma.changeRequest.findMany({
      where,
      include: { store: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    });
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all;
}

async function fetchAllCatalogRequests(where: Record<string, unknown>) {
  const pageSize = 1000;
  const all = [];
  for (let skip = 0; ; skip += pageSize) {
    const batch = await prisma.catalogRequest.findMany({
      where,
      include: {
        store: { select: { name: true } },
        campaign: { select: { name: true } },
        catalogItem: {
          select: {
            name: true,
            code: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    });
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all;
}

export async function generateRequestsExcelBuffer(
  filters: RequestsExportFilters
): Promise<Buffer> {
  const tab = filters.tab || "all";
  const includeVisual = tab === "all" || tab === "visual";
  const includeCatalog = tab === "all" || tab === "catalog";

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Mağaza Platform";
  workbook.created = new Date();

  const sizeInputs: SizeInput[] = [];
  const createdAt = dateFilter(filters.dateFrom, filters.dateTo);

  if (includeVisual) {
    const where: {
      storeId?: string;
      status?: ChangeRequestStatus;
      targetType?: ChangeTargetType;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};
    if (filters.storeId) where.storeId = filters.storeId;
    if (filters.status) where.status = filters.status as ChangeRequestStatus;
    if (filters.targetType) {
      where.targetType = filters.targetType as ChangeTargetType;
    }
    if (createdAt) where.createdAt = createdAt;

    const items = await fetchAllChangeRequests(where);
    const targetMap = await resolveChangeRequestTargets(
      items.map((i) => ({ targetType: i.targetType, targetId: i.targetId }))
    );

    const sheet = workbook.addWorksheet("Görsel Talepler");
    sheet.columns = [
      { header: "Mağaza", key: "store", width: 24 },
      { header: "Hedef Tür", key: "targetType", width: 16 },
      { header: "Özet", key: "summary", width: 40 },
      { header: "Reyon", key: "reyon", width: 18 },
      { header: "En", key: "en", width: 10 },
      { header: "Boy", key: "boy", width: 10 },
      { header: "Adet", key: "adet", width: 10 },
      { header: "Durum", key: "status", width: 22 },
      { header: "Not", key: "note", width: 28 },
      { header: "Tarih", key: "created", width: 20 },
    ];
    styleHeader(sheet);

    for (const req of items) {
      const target = targetMap.get(`${req.targetType}:${req.targetId}`);
      if (target?.en != null && target?.boy != null) {
        sizeInputs.push({
          en: target.en,
          boy: target.boy,
          adet: target.adet ?? 1,
          konum: target.konum ?? target.placementName,
        });
      }
      sheet.addRow({
        store: req.store.name,
        targetType:
          CHANGE_TARGET_TYPE_LABELS[req.targetType as keyof typeof CHANGE_TARGET_TYPE_LABELS] ??
          changeTargetTypeLabel(req.targetType),
        summary: target?.summary ?? "",
        reyon: target?.reyonCategoryName ?? "",
        en: target?.en ?? "",
        boy: target?.boy ?? "",
        adet: target?.adet ?? "",
        status: CHANGE_REQUEST_STATUS_LABELS[req.status] ?? req.status,
        note: req.note ?? "",
        created: req.createdAt.toLocaleString("tr-TR"),
      });
    }
  }

  if (includeCatalog) {
    const where: {
      storeId?: string;
      status?: ChangeRequestStatus;
      campaignId?: string | { not: null } | null;
      createdAt?: { gte?: Date; lte?: Date };
      catalogItem?: { categoryId?: string };
    } = {};
    if (filters.storeId) where.storeId = filters.storeId;
    if (filters.status) where.status = filters.status as ChangeRequestStatus;
    if (filters.campaignId) where.campaignId = filters.campaignId;
    else if (filters.scope === "campaign") where.campaignId = { not: null };
    else if (filters.scope === "product") where.campaignId = null;
    if (filters.categoryId) where.catalogItem = { categoryId: filters.categoryId };
    if (createdAt) where.createdAt = createdAt;

    const catalog = await fetchAllCatalogRequests(where);

    const detail = workbook.addWorksheet("Mağaza Ürün Adetleri");
    detail.columns = [
      { header: "Kampanya", key: "campaign", width: 24 },
      { header: "Mağaza", key: "store", width: 24 },
      { header: "Kategori", key: "category", width: 18 },
      { header: "Ürün", key: "product", width: 28 },
      { header: "Kod", key: "code", width: 14 },
      { header: "Adet", key: "quantity", width: 10 },
      { header: "Durum", key: "status", width: 22 },
      { header: "Not", key: "note", width: 28 },
      { header: "Tarih", key: "created", width: 20 },
    ];
    styleHeader(detail);

    const totals = new Map<
      string,
      { campaign: string; category: string; product: string; code: string; adet: number; kayit: number }
    >();

    for (const req of catalog) {
      detail.addRow({
        campaign: req.campaign?.name ?? "",
        store: req.store.name,
        category: req.catalogItem.category?.name ?? "",
        product: req.catalogItem.name,
        code: req.catalogItem.code,
        quantity: req.quantity ?? 0,
        status: CHANGE_REQUEST_STATUS_LABELS[req.status] ?? req.status,
        note: req.note ?? "",
        created: req.createdAt.toLocaleString("tr-TR"),
      });

      const key = `${req.campaign?.name ?? ""}|${req.catalogItem.code}`;
      const current = totals.get(key) ?? {
        campaign: req.campaign?.name ?? "",
        category: req.catalogItem.category?.name ?? "",
        product: req.catalogItem.name,
        code: req.catalogItem.code,
        adet: 0,
        kayit: 0,
      };
      current.adet += req.quantity ?? 0;
      current.kayit += 1;
      totals.set(key, current);
    }

    const summary = workbook.addWorksheet("Ürün Toplamları");
    summary.columns = [
      { header: "Kampanya", key: "campaign", width: 24 },
      { header: "Kategori", key: "category", width: 18 },
      { header: "Ürün", key: "product", width: 28 },
      { header: "Kod", key: "code", width: 14 },
      { header: "Toplam Adet", key: "adet", width: 12 },
      { header: "Mağaza/Kayıt", key: "kayit", width: 12 },
    ];
    styleHeader(summary);
    for (const row of [...totals.values()].sort((a, b) => b.adet - a.adet)) {
      summary.addRow(row);
    }
    summary.addRow({});
    summary.addRow({
      campaign: "GENEL TOPLAM",
      adet: [...totals.values()].reduce((s, r) => s + r.adet, 0),
      kayit: catalog.length,
    });
  }

  if (includeVisual) {
    const groups = groupSizesWithTolerance(sizeInputs);
    addSizeSummarySheet(
      workbook,
      groups,
      "Görsel taleplerin hedef ölçüleri"
    );
  }

  const meta = workbook.addWorksheet("Rapor Bilgisi");
  meta.columns = [
    { header: "Alan", key: "k", width: 22 },
    { header: "Değer", key: "v", width: 48 },
  ];
  styleHeader(meta);
  meta.addRow({ k: "Sekme", v: tab });
  meta.addRow({ k: "Mağaza", v: filters.storeId ?? "Tümü" });
  meta.addRow({ k: "Kampanya", v: filters.campaignId ?? "Tümü" });
  meta.addRow({ k: "Durum", v: filters.status ?? "Tümü" });
  meta.addRow({ k: "Başlangıç", v: filters.dateFrom ?? "-" });
  meta.addRow({ k: "Bitiş", v: filters.dateTo ?? "-" });
  meta.addRow({ k: "Oluşturma", v: new Date().toISOString() });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** JSON size summary for on-page UI (visual change-requests only). */
export async function fetchRequestSizeSummary(
  filters: RequestsExportFilters
): Promise<SizeGroup[]> {
  const where: {
    storeId?: string;
    status?: ChangeRequestStatus;
    targetType?: ChangeTargetType;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};
  if (filters.storeId) where.storeId = filters.storeId;
  if (filters.status) where.status = filters.status as ChangeRequestStatus;
  if (filters.targetType) {
    where.targetType = filters.targetType as ChangeTargetType;
  }
  const createdAt = dateFilter(filters.dateFrom, filters.dateTo);
  if (createdAt) where.createdAt = createdAt;

  const items = await fetchAllChangeRequests(where);

  const targetMap = await resolveChangeRequestTargets(
    items.map((i) => ({ targetType: i.targetType, targetId: i.targetId }))
  );

  const sizeInputs: SizeInput[] = [];
  for (const req of items) {
    const target = targetMap.get(`${req.targetType}:${req.targetId}`);
    if (target?.en != null && target?.boy != null) {
      sizeInputs.push({
        en: target.en,
        boy: target.boy,
        adet: target.adet ?? 1,
        konum: target.konum ?? target.placementName,
      });
    }
  }
  return groupSizesWithTolerance(sizeInputs);
}
