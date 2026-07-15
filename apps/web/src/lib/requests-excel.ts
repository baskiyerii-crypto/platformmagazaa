import ExcelJS from "exceljs";
import { prisma, ChangeRequestStatus, ChangeTargetType } from "@magaza/database";
import { CHANGE_REQUEST_STATUS_LABELS } from "@magaza/shared";
import { resolveChangeRequestTargets } from "@/lib/server/resolve-change-request-target";
import {
  groupSizesWithTolerance,
  SIZE_TOLERANCE_CM,
  type SizeGroup,
} from "@/lib/size-groups";

export type RequestsExportFilters = {
  status?: string;
  storeId?: string;
  targetType?: string;
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

export function addSizeSummarySheet(
  workbook: ExcelJS.Workbook,
  groups: SizeGroup[],
  titleNote?: string
) {
  const sheet = workbook.addWorksheet("Ölçü Özeti");
  sheet.columns = [
    { header: "Ölçü (ort. 3 cm)", key: "olcu", width: 22 },
    { header: "En (cm)", key: "en", width: 12 },
    { header: "Boy (cm)", key: "boy", width: 12 },
    { header: "Toplam Adet", key: "adet", width: 14 },
    { header: "Kayıt Sayısı", key: "kayit", width: 14 },
  ];
  styleHeader(sheet);

  if (titleNote) {
    sheet.insertRow(1, [`Tolerans ±${SIZE_TOLERANCE_CM} cm · ${titleNote}`]);
    sheet.mergeCells(1, 1, 1, 5);
    sheet.getRow(1).font = { italic: true, size: 10 };
    // header is now row 2
    const header = sheet.getRow(2);
    header.font = { bold: true };
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
  }

  for (const g of groups) {
    sheet.addRow({
      olcu: `${g.label} cm`,
      en: g.en,
      boy: g.boy,
      adet: g.toplamAdet,
      kayit: g.kayitSayisi,
    });
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

export async function generateRequestsExcelBuffer(
  filters: RequestsExportFilters
): Promise<Buffer> {
  const tab = filters.tab || "all";
  const includeVisual = tab === "all" || tab === "visual";
  const includeCatalog = tab === "all" || tab === "catalog";

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Mağaza Platform";
  workbook.created = new Date();

  const sizeInputs: { en: number; boy: number; adet?: number | null }[] = [];

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
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const items = await prisma.changeRequest.findMany({
      where,
      include: { store: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const targetMap = await resolveChangeRequestTargets(
      items.map((i) => ({ targetType: i.targetType, targetId: i.targetId }))
    );

    const sheet = workbook.addWorksheet("Görsel Talepler");
    sheet.columns = [
      { header: "Mağaza", key: "store", width: 24 },
      { header: "Hedef Tür", key: "targetType", width: 16 },
      { header: "Özet", key: "summary", width: 40 },
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
        });
      }
      sheet.addRow({
        store: req.store.name,
        targetType: req.targetType,
        summary: target?.summary ?? "",
        en: target?.en ?? "",
        boy: target?.boy ?? "",
        adet: target?.adet ?? "",
        status:
          CHANGE_REQUEST_STATUS_LABELS[req.status] ?? req.status,
        note: req.note ?? "",
        created: req.createdAt.toLocaleString("tr-TR"),
      });
    }
  }

  if (includeCatalog) {
    const where: {
      storeId?: string;
      status?: ChangeRequestStatus;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};
    if (filters.storeId) where.storeId = filters.storeId;
    if (filters.status) where.status = filters.status as ChangeRequestStatus;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const catalog = await prisma.catalogRequest.findMany({
      where,
      include: {
        store: { select: { name: true } },
        catalogItem: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const sheet = workbook.addWorksheet("Ürün Talepleri");
    sheet.columns = [
      { header: "Mağaza", key: "store", width: 24 },
      { header: "Ürün", key: "product", width: 28 },
      { header: "Kod", key: "code", width: 14 },
      { header: "Adet", key: "quantity", width: 10 },
      { header: "Durum", key: "status", width: 22 },
      { header: "Not", key: "note", width: 28 },
      { header: "Tarih", key: "created", width: 20 },
    ];
    styleHeader(sheet);

    for (const req of catalog) {
      sheet.addRow({
        store: req.store.name,
        product: req.catalogItem.name,
        code: req.catalogItem.code,
        quantity: req.quantity ?? "",
        status: CHANGE_REQUEST_STATUS_LABELS[req.status] ?? req.status,
        note: req.note ?? "",
        created: req.createdAt.toLocaleString("tr-TR"),
      });
    }
  }

  const groups = groupSizesWithTolerance(sizeInputs);
  addSizeSummarySheet(
    workbook,
    groups,
    includeVisual
      ? "Görsel taleplerin hedef ölçüleri"
      : "Ölçü özeti (görsel talep yok)"
  );

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
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
  }

  const items = await prisma.changeRequest.findMany({
    where,
    select: { targetType: true, targetId: true },
    take: 5000,
  });

  const targetMap = await resolveChangeRequestTargets(
    items.map((i) => ({ targetType: i.targetType, targetId: i.targetId }))
  );

  const sizeInputs: { en: number; boy: number; adet?: number | null }[] = [];
  for (const req of items) {
    const target = targetMap.get(`${req.targetType}:${req.targetId}`);
    if (target?.en != null && target?.boy != null) {
      sizeInputs.push({
        en: target.en,
        boy: target.boy,
        adet: target.adet ?? 1,
      });
    }
  }
  return groupSizesWithTolerance(sizeInputs);
}
