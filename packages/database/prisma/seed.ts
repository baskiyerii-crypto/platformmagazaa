import { PrismaClient, UserRole, AreaCategoryType, CatalogItemType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(
  username: string,
  password: string,
  role: UserRole,
  storeId?: string | null
) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { username },
    update: { passwordHash, role, storeId: storeId ?? null },
    create: { username, passwordHash, role, storeId: storeId ?? null },
  });
}

async function main() {
  const admin = await upsertUser("admin", "admin123", UserRole.ADMIN);
  await upsertUser("yusuf", "yusuf634152K", UserRole.ADMIN);
  await upsertUser("mudur", "mudur634152K", UserRole.MANAGER);

  const avmCategory = await prisma.areaCategory.upsert({
    where: { type: AreaCategoryType.AVM },
    update: {},
    create: { type: AreaCategoryType.AVM, name: "AVM Alanları" },
  });

  const acikHavaCategory = await prisma.areaCategory.upsert({
    where: { type: AreaCategoryType.ACIK_HAVA },
    update: {},
    create: { type: AreaCategoryType.ACIK_HAVA, name: "Açık Hava Alanları" },
  });

  const magazaIciCategory = await prisma.areaCategory.upsert({
    where: { type: AreaCategoryType.MAGAZA_ICI },
    update: {},
    create: { type: AreaCategoryType.MAGAZA_ICI, name: "Mağaza İçi Reklamlar" },
  });

  const subTypes = [
    { categoryId: avmCategory.id, name: "Ücretsiz Alan", code: "UCRETSIZ", sortOrder: 1 },
    { categoryId: avmCategory.id, name: "Ücretli Alan", code: "UCRETLI", sortOrder: 2 },
    { categoryId: acikHavaCategory.id, name: "Abriboard", code: "ABRIBOARD", sortOrder: 1 },
    { categoryId: acikHavaCategory.id, name: "Totem", code: "TOTEM", sortOrder: 2 },
    { categoryId: acikHavaCategory.id, name: "Pilon", code: "PILON", sortOrder: 3 },
    { categoryId: acikHavaCategory.id, name: "Cephe Giydirme", code: "CEPHE", sortOrder: 4 },
    { categoryId: magazaIciCategory.id, name: "Tabela", code: "TABELA", sortOrder: 1 },
    { categoryId: magazaIciCategory.id, name: "Lightbox", code: "LIGHTBOX", sortOrder: 2 },
    { categoryId: magazaIciCategory.id, name: "Folyo", code: "FOLYO", sortOrder: 3 },
    { categoryId: magazaIciCategory.id, name: "Görsel", code: "GORSEL", sortOrder: 4 },
    { categoryId: magazaIciCategory.id, name: "Diğer", code: "DIGER", sortOrder: 5 },
  ];

  for (const st of subTypes) {
    await prisma.areaSubType.upsert({
      where: {
        categoryId_code: { categoryId: st.categoryId, code: st.code },
      },
      update: { name: st.name, sortOrder: st.sortOrder },
      create: st,
    });
  }

  const placements = [
    { name: "Vitrin", code: "VITRIN", sortOrder: 1 },
    { name: "Kasa Arkası", code: "KASA_ARKASI", sortOrder: 2 },
    { name: "Giriş", code: "GIRIS", sortOrder: 3 },
    { name: "Giriş Üstü", code: "GIRIS_USTU", sortOrder: 4 },
    { name: "Sol Vitrin Camı", code: "SOL_VITRIN", sortOrder: 5 },
    { name: "Depo", code: "DEPO", sortOrder: 6 },
  ];

  for (const p of placements) {
    await prisma.placementOption.upsert({
      where: { code: p.code },
      update: { name: p.name, sortOrder: p.sortOrder },
      create: p,
    });
  }

  const store = await prisma.store.upsert({
    where: { id: "seed-store-kadikoy" },
    update: { storeNumber: "001" },
    create: {
      id: "seed-store-kadikoy",
      name: "Kadıköy Mağazası",
      storeNumber: "001",
      address: "Kadıköy, İstanbul",
      active: true,
    },
  });

  await upsertUser("kadikoy", "magaza123", UserRole.STORE, store.id);

  const catalogItems = [
    {
      name: "Demir Baş",
      code: "DEMIR_BAS",
      type: CatalogItemType.FIXED,
      description: "Sabit demir baş ürünü — mağaza talep açar",
      sortOrder: 1,
    },
    {
      name: "Yaka Kartı",
      code: "YAKA_KARTI",
      type: CatalogItemType.VARIABLE,
      description: "Değişken ürün — adet ile talep",
      sortOrder: 2,
    },
    {
      name: "Pleksi",
      code: "PLEKSI",
      type: CatalogItemType.VARIABLE,
      description: "Değişken pleksi ürün — adet ile talep",
      sortOrder: 3,
    },
  ];

  for (const item of catalogItems) {
    await prisma.catalogItem.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        type: item.type,
        description: item.description,
        sortOrder: item.sortOrder,
        active: true,
      },
      create: item,
    });
  }

  console.log("Seed tamamlandı:");
  console.log("  Ana Yönetici: yusuf / yusuf634152K");
  console.log("  Müdür: mudur / mudur634152K");
  console.log("  Demo: admin / admin123");
  console.log("  Mağaza: kadikoy / magaza123");
  console.log("  Admin ID:", admin.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
