import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";
import { prisma } from "@magaza/database";

export const STORE_IMPORT_HEADERS = [
  "Mağaza Adı",
  "Mağaza No",
  "Adres",
  "Kullanıcı Adı",
  "Şifre",
] as const;

export type StoreImportRowError = {
  row: number;
  message: string;
};

export type StoreImportResult = {
  created: number;
  skipped: number;
  errors: StoreImportRowError[];
};

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text.trim();
  }
  if (typeof value === "object" && "result" in value && value.result != null) {
    return String(value.result).trim();
  }
  return String(value).trim();
}

export async function generateStoreImportTemplateBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Mağazalar");
  sheet.addRow([...STORE_IMPORT_HEADERS]);
  sheet.getRow(1).font = { bold: true };
  sheet.addRow(["Örnek Mağaza", "002", "İstanbul", "ornek_magaza", "sifre123"]);
  sheet.getColumn(1).width = 24;
  sheet.getColumn(2).width = 14;
  sheet.getColumn(3).width = 28;
  sheet.getColumn(4).width = 18;
  sheet.getColumn(5).width = 16;
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function importStoresFromExcelBuffer(buffer: Buffer): Promise<StoreImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { created: 0, skipped: 0, errors: [{ row: 0, message: "Excel sayfası bulunamadı" }] };
  }

  const result: StoreImportResult = { created: 0, skipped: 0, errors: [] };

  const rows: Array<{
    row: number;
    name: string;
    storeNumber: string;
    address: string;
    username: string;
    password: string;
  }> = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const name = cellText(row.getCell(1).value);
    const storeNumber = cellText(row.getCell(2).value);
    const address = cellText(row.getCell(3).value);
    const username = cellText(row.getCell(4).value);
    const password = cellText(row.getCell(5).value);

    if (!name && !storeNumber && !username && !password && !address) {
      return;
    }

    rows.push({ row: rowNumber, name, storeNumber, address, username, password });
  });

  for (const item of rows) {
    if (!item.name) {
      result.errors.push({ row: item.row, message: "Mağaza adı gerekli" });
      result.skipped += 1;
      continue;
    }
    if (!item.storeNumber) {
      result.errors.push({ row: item.row, message: "Mağaza numarası gerekli" });
      result.skipped += 1;
      continue;
    }
    if (!item.username || item.username.length < 3) {
      result.errors.push({ row: item.row, message: "Kullanıcı adı en az 3 karakter olmalı" });
      result.skipped += 1;
      continue;
    }
    if (!item.password || item.password.length < 6) {
      result.errors.push({ row: item.row, message: "Şifre en az 6 karakter olmalı" });
      result.skipped += 1;
      continue;
    }

    const [existingNumber, existingUser] = await Promise.all([
      prisma.store.findUnique({ where: { storeNumber: item.storeNumber } }),
      prisma.user.findUnique({ where: { username: item.username } }),
    ]);

    if (existingNumber) {
      result.errors.push({ row: item.row, message: `Mağaza numarası kullanımda: ${item.storeNumber}` });
      result.skipped += 1;
      continue;
    }
    if (existingUser) {
      result.errors.push({ row: item.row, message: `Kullanıcı adı kullanımda: ${item.username}` });
      result.skipped += 1;
      continue;
    }

    try {
      const passwordHash = await bcrypt.hash(item.password, 12);
      await prisma.$transaction(async (tx) => {
        const created = await tx.store.create({
          data: {
            name: item.name,
            storeNumber: item.storeNumber,
            address: item.address || null,
            active: true,
          },
        });
        await tx.user.create({
          data: {
            username: item.username,
            passwordHash,
            role: "STORE",
            storeId: created.id,
          },
        });
      });
      result.created += 1;
    } catch (e) {
      result.errors.push({
        row: item.row,
        message: e instanceof Error ? e.message : "Satır kaydedilemedi",
      });
      result.skipped += 1;
    }
  }

  return result;
}
