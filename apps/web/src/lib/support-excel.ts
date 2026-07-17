import ExcelJS from "exceljs";
import { prisma } from "@magaza/database";
import { SUPPORT_TICKET_STATUS_LABELS, type SupportTicketStatus } from "@magaza/shared";

export type SupportExportFilters = {
  storeId?: string;
  /** OPEN | IN_PROGRESS | completed (RESOLVED+CLOSED) | all */
  tab?: string;
};

export async function generateSupportTicketsExcelBuffer(
  filters: SupportExportFilters = {}
): Promise<Buffer> {
  const where: {
    storeId?: string;
    status?: SupportTicketStatus | { in: SupportTicketStatus[] };
  } = {};

  if (filters.storeId) where.storeId = filters.storeId;
  if (filters.tab === "OPEN" || filters.tab === "IN_PROGRESS") {
    where.status = filters.tab;
  } else if (filters.tab === "completed") {
    where.status = { in: ["RESOLVED", "CLOSED"] };
  }

  const items = await prisma.supportTicket.findMany({
    where,
    include: { store: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Reklam Platform";
  const sheet = workbook.addWorksheet("Destek Talepleri");
  sheet.columns = [
    { header: "Tarih", key: "date", width: 18 },
    { header: "Mağaza", key: "store", width: 24 },
    { header: "Konu", key: "subject", width: 28 },
    { header: "Mesaj", key: "message", width: 40 },
    { header: "Durum", key: "status", width: 14 },
    { header: "Admin Notu", key: "note", width: 30 },
  ];
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  for (const t of items) {
    sheet.addRow([
      t.createdAt.toLocaleString("tr-TR"),
      t.store.name,
      t.subject,
      t.message,
      SUPPORT_TICKET_STATUS_LABELS[t.status as SupportTicketStatus] ?? t.status,
      t.adminNote ?? "",
    ]);
  }

  const meta = workbook.addWorksheet("Rapor Bilgisi");
  meta.columns = [
    { header: "Alan", key: "k", width: 20 },
    { header: "Değer", key: "v", width: 40 },
  ];
  meta.getRow(1).font = { bold: true };
  meta.addRow(["Kayıt sayısı", items.length]);
  meta.addRow(["Filtre", filters.tab ?? "Tümü"]);
  meta.addRow(["Mağaza", filters.storeId ?? "Tümü"]);
  meta.addRow(["Oluşturma", new Date().toISOString()]);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
