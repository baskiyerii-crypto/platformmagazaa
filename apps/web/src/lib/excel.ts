import ExcelJS from "exceljs";
import { prisma } from "@magaza/database";

export async function generateExcelBuffer(storeId?: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Mağaza Platform";
  workbook.created = new Date();

  const storeFilter = storeId ? { id: storeId } : {};
  const stores = await prisma.store.findMany({
    where: storeFilter,
    include: {
      avmEntries: {
        include: {
          subType: { include: { category: true } },
          vitrins: true,
          videos: { include: { placement: true } },
        },
      },
      outdoorEntries: { include: { subType: true } },
      signageEntries: { include: { subType: true, placement: true } },
      changeRequests: true,
    },
    orderBy: { name: "asc" },
  });

  const ucretsizSheet = workbook.addWorksheet("AVM Ücretsiz");
  ucretsizSheet.columns = [
    { header: "Mağaza", key: "store", width: 25 },
    { header: "Tür", key: "tur", width: 14 },
    { header: "No", key: "vitrinNo", width: 8 },
    { header: "Konum", key: "konum", width: 20 },
    { header: "En", key: "en", width: 10 },
    { header: "Boy", key: "boy", width: 10 },
    { header: "Cam En", key: "camEn", width: 10 },
    { header: "Cam Boy", key: "camBoy", width: 10 },
    { header: "Video Adet", key: "videoAdet", width: 12 },
    { header: "Video Konum", key: "videoKonum", width: 15 },
    { header: "Görsel URL", key: "gorsel", width: 40 },
    { header: "Güncelleme", key: "updated", width: 20 },
  ];

  const ucretliSheet = workbook.addWorksheet("AVM Ücretli");
  ucretliSheet.columns = ucretsizSheet.columns;

  const acikHavaSheet = workbook.addWorksheet("Açık Hava");
  acikHavaSheet.columns = [
    { header: "Mağaza", key: "store", width: 25 },
    { header: "Tür", key: "tur", width: 20 },
    { header: "En", key: "en", width: 10 },
    { header: "Boy", key: "boy", width: 10 },
    { header: "Adet", key: "adet", width: 10 },
    { header: "Not", key: "note", width: 30 },
    { header: "Görsel URL", key: "gorsel", width: 40 },
    { header: "Güncelleme", key: "updated", width: 20 },
  ];

  const magazaIciSheet = workbook.addWorksheet("Mağaza İçi");
  magazaIciSheet.columns = [
    { header: "Mağaza", key: "store", width: 25 },
    { header: "Tür", key: "tur", width: 20 },
    { header: "Konum", key: "konum", width: 25 },
    { header: "En", key: "en", width: 10 },
    { header: "Boy", key: "boy", width: 10 },
    { header: "Adet", key: "adet", width: 10 },
    { header: "Not", key: "note", width: 30 },
    { header: "Görsel URL", key: "gorsel", width: 40 },
    { header: "Güncelleme", key: "updated", width: 20 },
  ];

  const talepSheet = workbook.addWorksheet("Talepler");
  talepSheet.columns = [
    { header: "Mağaza", key: "store", width: 25 },
    { header: "Hedef", key: "target", width: 15 },
    { header: "Durum", key: "status", width: 20 },
    { header: "Talep Tarihi", key: "created", width: 20 },
    { header: "Tamamlanma", key: "completed", width: 20 },
    { header: "Not", key: "note", width: 30 },
  ];

  for (const store of stores) {
    for (const entry of store.avmEntries) {
      const sheet =
        entry.subType.code === "UCRETSIZ" ? ucretsizSheet : ucretliSheet;
      const videoSummary = entry.videos
        .map((v) => `${v.adet}x ${v.placement.name}`)
        .join(", ");

      if (entry.vitrins.length === 0 && entry.videos.length > 0) {
        sheet.addRow({
          store: store.name,
          videoAdet: entry.videos.reduce((s, v) => s + v.adet, 0),
          videoKonum: videoSummary,
          updated: entry.updatedAt.toISOString(),
        });
      }

      for (const vitrin of entry.vitrins) {
        sheet.addRow({
          store: store.name,
          tur: vitrin.kind === "EKSTRA_ALAN" ? "Ekstra Alan" : "Vitrin",
          vitrinNo: vitrin.siraNo,
          konum: vitrin.konum ?? "",
          en: vitrin.en,
          boy: vitrin.boy,
          camEn: vitrin.kind === "EKSTRA_ALAN" ? "" : vitrin.camEn ?? "",
          camBoy: vitrin.kind === "EKSTRA_ALAN" ? "" : vitrin.camBoy ?? "",
          videoAdet: entry.videos.reduce((s, v) => s + v.adet, 0) || "",
          videoKonum: videoSummary,
          gorsel: vitrin.gorselUrl ?? "",
          updated: vitrin.updatedAt.toISOString(),
        });
      }
    }

    for (const outdoor of store.outdoorEntries) {
      acikHavaSheet.addRow({
        store: store.name,
        tur: outdoor.subType.name,
        en: outdoor.en,
        boy: outdoor.boy,
        adet: outdoor.adet,
        note: outdoor.note ?? "",
        gorsel: outdoor.gorselUrl ?? "",
        updated: outdoor.updatedAt.toISOString(),
      });
    }

    for (const signage of store.signageEntries) {
      magazaIciSheet.addRow({
        store: store.name,
        tur: signage.subType.name,
        konum: signage.placement.name,
        en: signage.en,
        boy: signage.boy,
        adet: signage.adet,
        note: signage.note ?? "",
        gorsel: signage.gorselUrl ?? "",
        updated: signage.updatedAt.toISOString(),
      });
    }

    for (const req of store.changeRequests) {
      talepSheet.addRow({
        store: store.name,
        target: req.targetType,
        status: req.status,
        created: req.createdAt.toISOString(),
        completed: req.completedAt?.toISOString() ?? "",
        note: req.note ?? "",
      });
    }
  }

  [ucretsizSheet, ucretliSheet, acikHavaSheet, magazaIciSheet, talepSheet].forEach((sheet) => {
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
