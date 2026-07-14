import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { CHANGE_REQUEST_STATUS_LABELS, type ChangeRequestStatus } from "@magaza/shared";
import { loadThumbBuffer } from "@/lib/export-images";
import {
  fetchInventoryForExport,
  formatExportFilterSummary,
} from "@/lib/server/inventory-export-data";
import type { InventoryFilterOptions } from "@/lib/server/inventory-filters";

const MARGIN = 36;
const ROW_HEIGHT = 44;
const IMG_W = 40;
const IMG_H = 30;

function docToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = doc.pipe(new PassThrough());
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    doc.end();
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export async function generateInventoryPdfBuffer(
  filters: InventoryFilterOptions
): Promise<Buffer> {
  const rows = await fetchInventoryForExport(filters);
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: MARGIN,
    info: { Title: "Envanter Raporu" },
  });

  const pageWidth = doc.page.width - MARGIN * 2;
  const cols = {
    img: IMG_W + 8,
    store: 90,
    type: 72,
    label: 110,
    konum: 80,
    size: 55,
    status: 80,
    date: 95,
  };

  let y = MARGIN;

  doc.fontSize(14).font("Helvetica-Bold").text("Envanter Raporu", MARGIN, y);
  y += 20;
  doc.fontSize(9).font("Helvetica").text(formatExportFilterSummary(filters), MARGIN, y);
  y += 14;
  doc.fontSize(8).text(`Toplam: ${rows.length} kayıt · ${new Date().toLocaleString("tr-TR")}`, MARGIN, y);
  y += 18;

  function drawHeader() {
    doc.font("Helvetica-Bold").fontSize(8);
    let x = MARGIN;
    doc.text("Görsel", x, y, { width: cols.img });
    x += cols.img;
    doc.text("Mağaza", x, y, { width: cols.store });
    x += cols.store;
    doc.text("Tür", x, y, { width: cols.type });
    x += cols.type;
    doc.text("Açıklama", x, y, { width: cols.label });
    x += cols.label;
    doc.text("Konum", x, y, { width: cols.konum });
    x += cols.konum;
    doc.text("Ölçü", x, y, { width: cols.size });
    x += cols.size;
    doc.text("Durum", x, y, { width: cols.status });
    x += cols.status;
    doc.text("Tarih", x, y, { width: cols.date });
    y += 14;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + pageWidth, y).stroke("#CBD5E1");
    y += 6;
  }

  drawHeader();

  doc.font("Helvetica").fontSize(7);

  for (const row of rows) {
    const bottom = doc.page.height - MARGIN;
    if (y + ROW_HEIGHT > bottom) {
      doc.addPage({ size: "A4", layout: "landscape", margin: MARGIN });
      y = MARGIN;
      drawHeader();
      doc.font("Helvetica").fontSize(7);
    }

    const imgData = await loadThumbBuffer(row.imageUrl);
    if (imgData) {
      try {
        doc.image(imgData.buffer, MARGIN + 4, y + 4, {
          width: IMG_W,
          height: IMG_H,
          fit: [IMG_W, IMG_H],
        });
      } catch {
        /* skip broken image */
      }
    }

    let x = MARGIN + cols.img;
    const sizeStr =
      row.en && row.boy ? `${row.en}×${row.boy} cm` : row.adet ? `${row.adet} adet` : "";

    doc.text(truncate(row.storeName, 28), x, y + 8, { width: cols.store - 4 });
    x += cols.store;
    doc.text(truncate(row.typeLabel, 22), x, y + 8, { width: cols.type - 4 });
    x += cols.type;
    doc.text(truncate(row.label, 32), x, y + 8, { width: cols.label - 4 });
    x += cols.label;
    doc.text(truncate(row.konum, 24), x, y + 8, { width: cols.konum - 4 });
    x += cols.konum;
    doc.text(sizeStr, x, y + 8, { width: cols.size - 4 });
    x += cols.size;
    doc.text(truncate(row.status ? (CHANGE_REQUEST_STATUS_LABELS[row.status as ChangeRequestStatus] ?? row.status) : "", 24), x, y + 8, { width: cols.status - 4 });
    x += cols.status;
    doc.text(row.createdAt.toLocaleDateString("tr-TR"), x, y + 8, { width: cols.date - 4 });

    y += ROW_HEIGHT;
  }

  return docToBuffer(doc);
}
