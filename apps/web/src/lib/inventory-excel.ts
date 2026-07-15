import ExcelJS from "exceljs";
import { CHANGE_REQUEST_STATUS_LABELS, type ChangeRequestStatus } from "@magaza/shared";
import { loadThumbBuffer, toAbsoluteMediaUrl } from "@/lib/export-images";
import {
  fetchInventoryForExport,
  formatExportFilterSummary,
} from "@/lib/server/inventory-export-data";
import type { InventoryFilterOptions } from "@/lib/server/inventory-filters";
import { groupSizesWithTolerance } from "@/lib/size-groups";
import { addSizeSummarySheet } from "@/lib/requests-excel";

const ROW_HEIGHT = 48;

export async function generateInventoryExcelBuffer(
  filters: InventoryFilterOptions
): Promise<Buffer> {
  const rows = await fetchInventoryForExport(filters);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Mağaza Platform";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Envanter");
  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 22;
  sheet.getColumn(3).width = 14;
  sheet.getColumn(4).width = 24;
  sheet.getColumn(5).width = 16;
  sheet.getColumn(6).width = 16;
  sheet.getColumn(7).width = 8;
  sheet.getColumn(8).width = 8;
  sheet.getColumn(9).width = 8;
  sheet.getColumn(10).width = 18;
  sheet.getColumn(11).width = 20;
  sheet.getColumn(12).width = 48;

  sheet.addRow([`Filtre: ${formatExportFilterSummary(filters)}`]);
  sheet.mergeCells(1, 1, 1, 12);
  sheet.getRow(1).font = { italic: true, size: 10 };

  const headerRow = sheet.addRow([
    "Görsel",
    "Mağaza",
    "Tür",
    "Açıklama",
    "Alt Tür",
    "Konum",
    "En",
    "Boy",
    "Adet",
    "Durum",
    "Tarih",
    "Görsel Linki",
  ]);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  let rowIndex = 3;
  for (const row of rows) {
    const imageLink = toAbsoluteMediaUrl(row.imageUrl);
    const excelRow = sheet.addRow([
      "",
      row.storeName,
      row.typeLabel,
      row.label,
      row.subtype,
      row.konum,
      row.en,
      row.boy,
      row.adet,
      row.status ? (CHANGE_REQUEST_STATUS_LABELS[row.status as ChangeRequestStatus] ?? row.status) : "",
      row.createdAt.toLocaleString("tr-TR"),
      imageLink ?? "",
    ]);
    excelRow.height = ROW_HEIGHT;

    if (imageLink) {
      const linkCell = excelRow.getCell(12);
      linkCell.value = { text: imageLink, hyperlink: imageLink };
      linkCell.font = { color: { argb: "FF2563EB" }, underline: true };
    }

    const img = await loadThumbBuffer(row.imageUrl);
    if (img) {
      const imageId = workbook.addImage({
        buffer: img.buffer as unknown as ExcelJS.Buffer,
        extension: img.extension,
      });
      sheet.addImage(imageId, {
        tl: { col: 0, row: rowIndex - 1 },
        ext: { width: 56, height: 42 },
      });
    }

    rowIndex++;
  }

  const groups = groupSizesWithTolerance(
    rows
      .map((r) => ({
        en: Number(r.en),
        boy: Number(r.boy),
        adet: Number(r.adet) || 1,
      }))
      .filter((r) => Number.isFinite(r.en) && Number.isFinite(r.boy) && r.en > 0 && r.boy > 0)
  );
  addSizeSummarySheet(workbook, groups, formatExportFilterSummary(filters));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
