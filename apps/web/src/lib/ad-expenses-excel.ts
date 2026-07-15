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

export async function generateAdExpensesExcelBuffer(filters: AdExpenseFilters) {
  const items = await listAdExpenses(filters);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Platform Magaza";

  const sheet = workbook.addWorksheet("Reklam Giderleri");
  sheet.columns = [
    { header: "Tarih", key: "date", width: 14 },
    { header: "Mağaza", key: "store", width: 24 },
    { header: "Kategori", key: "category", width: 20 },
    { header: "Kampanya", key: "campaign", width: 28 },
    { header: "Başlık", key: "title", width: 28 },
    { header: "Adet", key: "qty", width: 10 },
    { header: "Toplam Fiyat (TL)", key: "total", width: 16 },
    { header: "Not", key: "note", width: 30 },
    { header: "Giren", key: "user", width: 16 },
  ];
  styleHeader(sheet);

  let sum = 0;
  for (const item of items) {
    sum += item.totalPrice;
    sheet.addRow({
      date: new Date(item.expenseDate).toLocaleDateString("tr-TR"),
      store: item.store.name,
      category: item.category.name,
      campaign: item.announcement?.title ?? "Kampanya dışı",
      title: item.title,
      qty: item.quantity,
      total: item.totalPrice,
      note: item.note ?? "",
      user: item.createdBy.username,
    });
  }

  sheet.addRow({});
  const totalRow = sheet.addRow({
    date: "",
    store: "",
    category: "",
    campaign: "",
    title: "GENEL TOPLAM",
    qty: items.reduce((s, i) => s + i.quantity, 0),
    total: sum,
    note: `${items.length} kayıt`,
    user: "",
  });
  totalRow.font = { bold: true };

  const periodLabel =
    filters.period === "day"
      ? "Günlük"
      : filters.period === "month"
        ? "Aylık"
        : filters.period === "year"
          ? "Yıllık"
          : "Özel / Tümü";

  const meta = workbook.addWorksheet("Rapor Bilgisi");
  meta.columns = [
    { header: "Alan", key: "k", width: 22 },
    { header: "Değer", key: "v", width: 40 },
  ];
  styleHeader(meta);
  meta.addRow({ k: "Dönem", v: periodLabel });
  meta.addRow({ k: "Başlangıç", v: filters.dateFrom ?? "-" });
  meta.addRow({ k: "Bitiş", v: filters.dateTo ?? "-" });
  meta.addRow({ k: "Kategori ID", v: filters.categoryId ?? "Tümü" });
  meta.addRow({ k: "Kampanya ID", v: filters.announcementId ?? "Tümü" });
  meta.addRow({ k: "Mağaza ID", v: filters.storeId ?? "Tümü" });
  meta.addRow({ k: "Bağlantı", v: filters.link ?? "all" });
  meta.addRow({ k: "Kayıt adedi", v: items.length });
  meta.addRow({ k: "Toplam tutar", v: sum });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
