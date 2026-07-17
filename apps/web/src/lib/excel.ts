import ExcelJS from "exceljs";
import { prisma } from "@magaza/database";
import {
  CHANGE_REQUEST_STATUS_LABELS,
  CHANGE_TARGET_TYPE_LABELS,
  changeTargetTypeLabel,
} from "@magaza/shared";
import { groupSizesWithTolerance, type SizeInput } from "@/lib/size-groups";
import { addSizeSummarySheet } from "@/lib/requests-excel";
import { toAbsoluteMediaUrl } from "@/lib/export-images";

function styleHeader(sheet: ExcelJS.Worksheet, rowNumber = 1) {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
}

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  headers: string[],
  widths: number[]
) {
  const sheet = workbook.addWorksheet(name);
  headers.forEach((_, i) => {
    sheet.getColumn(i + 1).width = widths[i] ?? 14;
  });
  sheet.addRow(headers);
  styleHeader(sheet, 1);
  return sheet;
}

/**
 * Detaylı mağaza Excel'i.
 * Satırlar key/object yerine dizi ile yazılır (ExcelJS + Next Response güvenilir).
 */
export async function generateExcelBuffer(storeId?: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Mağaza Platform";
  workbook.created = new Date();

  const storeWhere = storeId ? { id: storeId } : undefined;

  const [vitrins, outdoors, signages, requests, catalogRequests, storeCount] = await Promise.all([
    prisma.avmVitrin.findMany({
      where: storeWhere ? { avmEntry: { storeId } } : undefined,
      include: {
        avmEntry: {
          include: {
            store: { select: { name: true } },
            subType: { select: { name: true, code: true } },
            videos: { include: { placement: { select: { name: true } } } },
          },
        },
      },
      orderBy: [{ siraNo: "asc" }, { createdAt: "desc" }],
    }),
    prisma.outdoorEntry.findMany({
      where: storeWhere ? { storeId } : undefined,
      include: {
        store: { select: { name: true } },
        subType: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.storeSignageEntry.findMany({
      where: storeWhere ? { storeId } : undefined,
      include: {
        store: { select: { name: true } },
        subType: { select: { name: true } },
        placement: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.changeRequest.findMany({
      where: storeWhere ? { storeId } : undefined,
      include: { store: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.catalogRequest.findMany({
      where: storeWhere ? { storeId } : undefined,
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
    }),
    prisma.store.count({ where: storeWhere }),
  ]);

  const avmHeaders = [
    "Mağaza",
    "Tür",
    "No",
    "Konum",
    "En",
    "Boy",
    "Cam En",
    "Cam Boy",
    "Video Adet",
    "Video Konum",
    "Görsel URL",
    "Güncelleme",
  ];
  const avmWidths = [22, 12, 8, 18, 8, 8, 8, 8, 10, 16, 36, 18];

  const ucretsizSheet = addSheet(workbook, "AVM Ücretsiz", avmHeaders, avmWidths);
  const ucretliSheet = addSheet(workbook, "AVM Ücretli", avmHeaders, avmWidths);

  const acikHavaSheet = addSheet(
    workbook,
    "Açık Hava",
    ["Mağaza", "Tür", "En", "Boy", "Adet", "Not", "Görsel URL", "Güncelleme"],
    [22, 18, 8, 8, 8, 28, 36, 18]
  );

  const magazaIciSheet = addSheet(
    workbook,
    "Mağaza İçi",
    ["Mağaza", "Tür", "Konum", "En", "Boy", "Adet", "Not", "Görsel URL", "Güncelleme"],
    [22, 18, 18, 8, 8, 8, 28, 36, 18]
  );

  const talepSheet = addSheet(
    workbook,
    "Görsel Talepler",
    ["Mağaza", "Hedef", "Durum", "Talep Tarihi", "Tamamlanma", "Not"],
    [22, 14, 16, 18, 18, 28]
  );

  const urunTalepSheet = addSheet(
    workbook,
    "Kampanya Talepleri",
    ["Mağaza", "Kampanya", "Kategori", "Ürün", "Kod", "Adet", "Durum", "Tarih"],
    [22, 20, 16, 24, 14, 8, 18, 18]
  );

  const ozetSheet = addSheet(
    workbook,
    "Özet",
    ["Alan", "Değer"],
    [28, 40]
  );

  const sizeInputs: SizeInput[] = [];

  for (const v of vitrins) {
    const entry = v.avmEntry;
    const sheet = entry.subType.code === "UCRETSIZ" ? ucretsizSheet : ucretliSheet;
    const videoSummary = entry.videos
      .map((vid) => `${vid.adet}x ${vid.placement.name}`)
      .join(", ");
    const videoAdet = entry.videos.reduce((s, vid) => s + vid.adet, 0);
    const tur = v.kind === "EKSTRA_ALAN" ? "Ekstra Alan" : "Vitrin";
    const konum =
      v.konum?.trim() || (v.kind === "EKSTRA_ALAN" ? "Ekstra Alan" : "Vitrin");

    sheet.addRow([
      entry.store.name,
      tur,
      v.siraNo,
      v.konum ?? "",
      v.en,
      v.boy,
      v.kind === "EKSTRA_ALAN" ? "" : (v.camEn ?? ""),
      v.kind === "EKSTRA_ALAN" ? "" : (v.camBoy ?? ""),
      videoAdet || "",
      videoSummary,
      v.gorselUrl ? toAbsoluteMediaUrl(v.gorselUrl) ?? v.gorselUrl : "",
      v.updatedAt.toISOString(),
    ]);

    sizeInputs.push({ en: v.en, boy: v.boy, adet: 1, konum });
  }

  const seenVideoEntries = new Set<string>();
  for (const v of vitrins) {
    const entry = v.avmEntry;
    if (seenVideoEntries.has(entry.id)) continue;
    seenVideoEntries.add(entry.id);
    for (const video of entry.videos) {
      if (video.en != null && video.boy != null && video.en > 0 && video.boy > 0) {
        sizeInputs.push({
          en: video.en,
          boy: video.boy,
          adet: video.adet,
          konum: video.placement.name,
        });
      }
    }
  }

  // Video-only AVM entries (no vitrin rows)
  const videoOnlyEntries = await prisma.avmEntry.findMany({
    where: {
      ...(storeId ? { storeId } : {}),
      vitrins: { none: {} },
      videos: { some: {} },
    },
    include: {
      store: { select: { name: true } },
      subType: { select: { code: true } },
      videos: { include: { placement: { select: { name: true } } } },
    },
  });

  for (const entry of videoOnlyEntries) {
    const sheet = entry.subType.code === "UCRETSIZ" ? ucretsizSheet : ucretliSheet;
    const videoSummary = entry.videos
      .map((vid) => `${vid.adet}x ${vid.placement.name}`)
      .join(", ");
    sheet.addRow([
      entry.store.name,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      entry.videos.reduce((s, vid) => s + vid.adet, 0),
      videoSummary,
      "",
      entry.updatedAt.toISOString(),
    ]);
    for (const video of entry.videos) {
      if (video.en != null && video.boy != null && video.en > 0 && video.boy > 0) {
        sizeInputs.push({
          en: video.en,
          boy: video.boy,
          adet: video.adet,
          konum: video.placement.name,
        });
      }
    }
  }

  for (const o of outdoors) {
    acikHavaSheet.addRow([
      o.store.name,
      o.subType.name,
      o.en,
      o.boy,
      o.adet,
      o.note ?? "",
      o.gorselUrl ? toAbsoluteMediaUrl(o.gorselUrl) ?? o.gorselUrl : "",
      o.updatedAt.toISOString(),
    ]);
    sizeInputs.push({
      en: o.en,
      boy: o.boy,
      adet: o.adet,
      konum: o.subType.name,
    });
  }

  for (const s of signages) {
    magazaIciSheet.addRow([
      s.store.name,
      s.subType.name,
      s.placement.name,
      s.en,
      s.boy,
      s.adet,
      s.note ?? "",
      s.gorselUrl ? toAbsoluteMediaUrl(s.gorselUrl) ?? s.gorselUrl : "",
      s.updatedAt.toISOString(),
    ]);
    sizeInputs.push({
      en: s.en,
      boy: s.boy,
      adet: s.adet,
      konum: s.placement.name,
    });
  }

  for (const req of requests) {
    talepSheet.addRow([
      req.store.name,
      CHANGE_TARGET_TYPE_LABELS[req.targetType as keyof typeof CHANGE_TARGET_TYPE_LABELS] ??
        changeTargetTypeLabel(req.targetType),
      CHANGE_REQUEST_STATUS_LABELS[req.status] ?? req.status,
      req.createdAt.toISOString(),
      req.completedAt?.toISOString() ?? "",
      req.note ?? "",
    ]);
  }

  for (const req of catalogRequests) {
    urunTalepSheet.addRow([
      req.store.name,
      req.campaign?.name ?? "",
      req.catalogItem.category?.name ?? "",
      req.catalogItem.name,
      req.catalogItem.code,
      req.quantity ?? 0,
      CHANGE_REQUEST_STATUS_LABELS[req.status] ?? req.status,
      req.createdAt.toISOString(),
    ]);
  }

  const dataRowCount =
    vitrins.length +
    videoOnlyEntries.length +
    outdoors.length +
    signages.length +
    requests.length +
    catalogRequests.length;

  ozetSheet.addRow(["Mağaza sayısı", storeCount]);
  ozetSheet.addRow(["AVM vitrin / ekstra", vitrins.length]);
  ozetSheet.addRow(["AVM yalnızca video", videoOnlyEntries.length]);
  ozetSheet.addRow(["Açık hava", outdoors.length]);
  ozetSheet.addRow(["Mağaza içi", signages.length]);
  ozetSheet.addRow(["Görsel talepler", requests.length]);
  ozetSheet.addRow(["Kampanya / ürün talepleri", catalogRequests.length]);
  ozetSheet.addRow(["Toplam satır", dataRowCount]);
  ozetSheet.addRow([
    "Filtre",
    storeId ? `Mağaza id: ${storeId}` : "Tüm mağazalar",
  ]);
  ozetSheet.addRow(["Oluşturma", new Date().toISOString()]);

  if (dataRowCount === 0) {
    ozetSheet.addRow([
      "Uyarı",
      "Veritabanında bu filtreye ait envanter kaydı yok. Admin → Envanter sayfasını kontrol edin.",
    ]);
  }

  const groups = groupSizesWithTolerance(sizeInputs);
  addSizeSummarySheet(
    workbook,
    groups,
    storeId ? `Mağaza filtresi: ${storeId}` : "Tüm mağazalar"
  );

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
