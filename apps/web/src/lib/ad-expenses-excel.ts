import ExcelJS from "exceljs";
import { listAdExpenses, type AdExpenseFilters } from "@/lib/ad-expenses";

function styleHeader(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
}

function reportTypeLabel(link?: AdExpenseFilters["link"]) {
  if (link === "campaign") return "Kampanya Giderleri";
  if (link === "general") return "Özel Giderler (Kampanya Dışı)";
  return "Tüm Reklam Giderleri";
}

export async function generateAdExpensesExcelBuffer(filters: AdExpenseFilters) {
  const items = await listAdExpenses(filters);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Platform Magaza";

  const isCampaignOnly = filters.link === "campaign";
  const isSpecialOnly = filters.link === "general";
  const sheetName = isCampaignOnly
    ? "Kampanya Giderleri"
    : isSpecialOnly
      ? "Özel Giderler"
      : "Tüm Giderler";

  const sheet = workbook.addWorksheet(sheetName);
  const columns: Partial<ExcelJS.Column>[] = [
    { header: "Tarih", key: "date", width: 14 },
    { header: "Mağaza", key: "store", width: 24 },
    { header: "Kategori", key: "category", width: 20 },
  ];
  if (!isSpecialOnly) {
    columns.push({ header: "Kampanya", key: "campaign", width: 28 });
  }
  columns.push(
    { header: "Başlık", key: "title", width: 28 },
    { header: "Adet", key: "qty", width: 10 },
    { header: "Toplam Fiyat (TL)", key: "total", width: 16 },
    { header: "Not", key: "note", width: 30 },
    { header: "Giren", key: "user", width: 16 }
  );
  sheet.columns = columns;
  styleHeader(sheet);

  let sum = 0;
  for (const item of items) {
    sum += item.totalPrice;
    const row: Record<string, string | number> = {
      date: new Date(item.expenseDate).toLocaleDateString("tr-TR"),
      store: item.store.name,
      category: item.category.name,
      title: item.title,
      qty: item.quantity,
      total: item.totalPrice,
      note: item.note ?? "",
      user: item.createdBy.username,
    };
    if (!isSpecialOnly) {
      row.campaign = item.announcement?.title ?? "Kampanya dışı";
    }
    sheet.addRow(row);
  }

  sheet.addRow({});
  const totalPayload: Record<string, string | number> = {
    date: "",
    store: "",
    category: "",
    title: "GENEL TOPLAM",
    qty: items.reduce((s, i) => s + i.quantity, 0),
    total: sum,
    note: `${items.length} kayıt`,
    user: "",
  };
  if (!isSpecialOnly) totalPayload.campaign = "";
  const totalRow = sheet.addRow(totalPayload);
  totalRow.font = { bold: true };

  const periodLabel =
    filters.period === "day"
      ? "Günlük"
      : filters.period === "month"
        ? "Aylık"
        : filters.period === "year"
          ? "Yıllık"
          : "Özel tarih / Tümü";

  const meta = workbook.addWorksheet("Rapor Bilgisi");
  meta.columns = [
    { header: "Alan", key: "k", width: 22 },
    { header: "Değer", key: "v", width: 48 },
  ];
  styleHeader(meta);
  meta.addRow({ k: "Rapor türü", v: reportTypeLabel(filters.link) });
  meta.addRow({ k: "Dönem", v: periodLabel });
  meta.addRow({ k: "Başlangıç", v: filters.dateFrom ?? "-" });
  meta.addRow({ k: "Bitiş", v: filters.dateTo ?? "-" });
  meta.addRow({ k: "Kategori", v: filters.categoryId ?? "Tümü" });
  meta.addRow({
    k: "Kampanya filtresi",
    v: isSpecialOnly ? "Yok (özel giderler)" : filters.announcementId ?? "Tümü",
  });
  meta.addRow({ k: "Mağaza", v: filters.storeId ?? "Tümü" });
  meta.addRow({ k: "Kayıt adedi", v: items.length });
  meta.addRow({ k: "Toplam tutar (TL)", v: sum });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
