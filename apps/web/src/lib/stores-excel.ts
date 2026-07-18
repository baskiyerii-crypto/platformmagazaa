import ExcelJS from "exceljs";
import { prisma } from "@magaza/database";

export async function generateStoresExcelBuffer(): Promise<Buffer> {
  const stores = await prisma.store.findMany({
    include: {
      users: {
        where: { role: "STORE" },
        select: { username: true, role: true },
        orderBy: { username: "asc" },
      },
      _count: {
        select: {
          avmEntries: true,
          outdoorEntries: true,
          signageEntries: true,
          changeRequests: true,
          catalogRequests: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Reklam Platform";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Mağazalar");
  sheet.columns = [
    { header: "Mağaza Adı", key: "name", width: 28 },
    { header: "Mağaza No", key: "storeNumber", width: 14 },
    { header: "Adres", key: "address", width: 36 },
    { header: "Aktif", key: "active", width: 10 },
    { header: "Kullanıcılar", key: "users", width: 32 },
    { header: "AVM Kayıt", key: "avm", width: 12 },
    { header: "Açık Hava", key: "outdoor", width: 12 },
    { header: "Mağaza İçi", key: "signage", width: 12 },
    { header: "Görsel Talep", key: "changeReq", width: 12 },
    { header: "Ürün/Kampanya Talep", key: "catalogReq", width: 18 },
    { header: "Oluşturma", key: "createdAt", width: 20 },
    { header: "Güncelleme", key: "updatedAt", width: 20 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  for (const store of stores) {
    sheet.addRow({
      name: store.name,
      storeNumber: store.storeNumber ?? "",
      address: store.address ?? "",
      active: store.active ? "Evet" : "Hayır",
      users: store.users.map((u) => u.username).join(", "),
      avm: store._count.avmEntries,
      outdoor: store._count.outdoorEntries,
      signage: store._count.signageEntries,
      changeReq: store._count.changeRequests,
      catalogReq: store._count.catalogRequests,
      createdAt: store.createdAt.toLocaleString("tr-TR"),
      updatedAt: store.updatedAt.toLocaleString("tr-TR"),
    });
  }

  const meta = workbook.addWorksheet("Rapor Bilgisi");
  meta.addRow(["Rapor", "Mağaza listesi"]);
  meta.addRow(["Toplam mağaza", stores.length]);
  meta.addRow(["Oluşturma", new Date().toISOString()]);
  meta.getColumn(1).width = 18;
  meta.getColumn(2).width = 40;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
