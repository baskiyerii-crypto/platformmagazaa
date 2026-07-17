/**
 * Production bootstrap: upserts seed users and always resets their passwords
 * to the documented defaults so admin login works after DB wipe / redeploy.
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function ensureUser(username, password, role, storeId = null) {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { username } });

  if (existing) {
    const user = await prisma.user.update({
      where: { username },
      data: {
        passwordHash,
        role,
        ...(storeId != null ? { storeId } : {}),
      },
    });
    console.log(`[ensure-seed] user password reset: ${username} (${role})`);
    return user;
  }

  const user = await prisma.user.create({
    data: { username, passwordHash, role, storeId },
  });
  console.log(`[ensure-seed] user created: ${username} (${role})`);
  return user;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn("[ensure-seed] DATABASE_URL missing — skipped");
    return;
  }

  console.log("[ensure-seed] starting...");

  // Admin users FIRST — must succeed even if store schema is behind
  await ensureUser("admin", "admin123", "ADMIN");
  await ensureUser("yusuf", "yusuf634152K", "ADMIN");
  await ensureUser("mudur", "mudur634152K", "MANAGER");
  console.log("[ensure-seed] admin users ready — login: yusuf / yusuf634152K");

  try {
    await seedDefinitionsAndStore();
  } catch (e) {
    console.error(
      "[ensure-seed] definitions/store skipped (run prisma db push):",
      e?.message || e
    );
  }

  console.log("[ensure-seed] done");
}

async function seedDefinitionsAndStore() {
  const avmCategory = await prisma.areaCategory.upsert({
    where: { type: "AVM" },
    update: {},
    create: { type: "AVM", name: "AVM Alanları" },
  });

  const acikHavaCategory = await prisma.areaCategory.upsert({
    where: { type: "ACIK_HAVA" },
    update: {},
    create: { type: "ACIK_HAVA", name: "Açık Hava Alanları" },
  });

  const magazaIciCategory = await prisma.areaCategory.upsert({
    where: { type: "MAGAZA_ICI" },
    update: {},
    create: { type: "MAGAZA_ICI", name: "Mağaza İçi Reklamlar" },
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
      where: { categoryId_code: { categoryId: st.categoryId, code: st.code } },
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
    update: { storeNumber: "001", name: "Kadıköy Mağazası" },
    create: {
      id: "seed-store-kadikoy",
      name: "Kadıköy Mağazası",
      storeNumber: "001",
      address: "Kadıköy, İstanbul",
      active: true,
    },
  });

  await ensureUser("kadikoy", "magaza123", "STORE", store.id);

  // Default permanent campaign + category for fixed prints / catalog
  let campaign = await prisma.catalogCampaign.findFirst({
    where: { name: "Genel Katalog" },
    orderBy: { createdAt: "asc" },
  });
  if (!campaign) {
    campaign = await prisma.catalogCampaign.create({
      data: {
        name: "Genel Katalog",
        description: "Kalıcı sabit baskı / ürün kataloğu",
        mode: "PERMANENT",
        active: true,
        sortOrder: 0,
      },
    });
    console.log("[ensure-seed] default catalog campaign created");
  }

  let category = await prisma.catalogCategory.findFirst({
    where: { campaignId: campaign.id, name: "Genel" },
  });
  if (!category) {
    category = await prisma.catalogCategory.create({
      data: {
        campaignId: campaign.id,
        name: "Genel",
        sortOrder: 0,
        active: true,
      },
    });
    console.log("[ensure-seed] default catalog category created");
  }

  const catalogItems = [
    {
      name: "Demir Baş",
      code: "DEMIR_BAS",
      type: "FIXED",
      description: "Sabit demir baş ürünü — mağaza adet bildirir",
      sortOrder: 1,
    },
    {
      name: "Yaka Kartı",
      code: "YAKA_KARTI",
      type: "VARIABLE",
      description: "Değişken ürün — adet ile talep",
      sortOrder: 2,
    },
    {
      name: "Pleksi",
      code: "PLEKSI",
      type: "VARIABLE",
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
        campaignId: campaign.id,
        categoryId: category.id,
      },
      create: {
        ...item,
        campaignId: campaign.id,
        categoryId: category.id,
      },
    });
  }

  // Backfill orphan catalog items / requests
  await prisma.catalogItem.updateMany({
    where: { OR: [{ campaignId: null }, { categoryId: null }] },
    data: { campaignId: campaign.id, categoryId: category.id },
  });

  const orphanRequests = await prisma.catalogRequest.findMany({
    where: { campaignId: null },
    select: { id: true, catalogItemId: true },
  });
  if (orphanRequests.length > 0) {
    const itemIds = [...new Set(orphanRequests.map((r) => r.catalogItemId))];
    const items = await prisma.catalogItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, campaignId: true },
    });
    const campaignByItem = new Map(items.map((i) => [i.id, i.campaignId]));
    for (const req of orphanRequests) {
      const campaignId = campaignByItem.get(req.catalogItemId) ?? campaign.id;
      await prisma.catalogRequest.update({
        where: { id: req.id },
        data: { campaignId },
      });
    }
    console.log(`[ensure-seed] backfilled ${orphanRequests.length} catalog requests`);
  }
}

main()
  .catch((e) => {
    console.error("[ensure-seed] FAILED:", e?.message || e);
    // Do not crash the app if seed fails — schema push may still allow login later
    process.exitCode = 0;
  })
  .finally(() => prisma.$disconnect());
