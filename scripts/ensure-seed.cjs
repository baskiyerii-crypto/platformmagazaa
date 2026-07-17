/**
 * Production bootstrap seed.
 *
 * Default (every deploy): only ensure missing ADMIN/MANAGER logins exist.
 * Does NOT recreate deleted demo store / catalog products / reset passwords.
 *
 * Env:
 *   SKIP_SEED=1              — skip entirely
 *   FORCE_SEED=1             — first-time style: demos + structural defs + optional password reset
 *   FORCE_SEED_PASSWORDS=1   — reset known admin passwords to defaults (use carefully)
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const skip = /^(1|true|yes)$/i.test(String(process.env.SKIP_SEED || ""));
const forceSeed = /^(1|true|yes)$/i.test(String(process.env.FORCE_SEED || ""));
const forcePasswords = /^(1|true|yes)$/i.test(
  String(process.env.FORCE_SEED_PASSWORDS || "")
);

async function ensureUser(username, password, role, storeId = null, { resetPassword = false } = {}) {
  const existing = await prisma.user.findUnique({ where: { username } });

  if (existing) {
    if (!resetPassword && storeId == null) {
      return existing;
    }
    const data = {
      role,
      ...(storeId != null ? { storeId } : {}),
    };
    if (resetPassword) {
      data.passwordHash = await bcrypt.hash(password, 12);
    }
    const user = await prisma.user.update({
      where: { username },
      data,
    });
    if (resetPassword) {
      console.log(`[ensure-seed] user password reset: ${username} (${role})`);
    }
    return user;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, passwordHash, role, storeId },
  });
  console.log(`[ensure-seed] user created: ${username} (${role})`);
  return user;
}

async function ensureAdmins({ resetPassword }) {
  await ensureUser("admin", "admin123", "ADMIN", null, { resetPassword });
  await ensureUser("yusuf", "yusuf634152K", "ADMIN", null, { resetPassword });
  await ensureUser("mudur", "mudur634152K", "MANAGER", null, { resetPassword });
  console.log("[ensure-seed] admin users ensured (missing-only unless password reset)");
}

async function seedStructuralDefinitions() {
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
    // create-only: do not revive admin-deleted subtypes
    const existing = await prisma.areaSubType.findUnique({
      where: { categoryId_code: { categoryId: st.categoryId, code: st.code } },
    });
    if (!existing) {
      await prisma.areaSubType.create({ data: st });
      console.log(`[ensure-seed] subtype created: ${st.code}`);
    }
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
    const existing = await prisma.placementOption.findUnique({ where: { code: p.code } });
    if (!existing) {
      await prisma.placementOption.create({ data: p });
      console.log(`[ensure-seed] placement created: ${p.code}`);
    }
  }
}

async function seedDemoStoreAndCatalog() {
  const store = await prisma.store.upsert({
    where: { id: "seed-store-kadikoy" },
    update: {},
    create: {
      id: "seed-store-kadikoy",
      name: "Kadıköy Mağazası",
      storeNumber: "001",
      address: "Kadıköy, İstanbul",
      active: true,
    },
  });
  console.log("[ensure-seed] demo store ensured: Kadıköy");

  await ensureUser("kadikoy", "magaza123", "STORE", store.id, { resetPassword: true });

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
    const existing = await prisma.catalogItem.findUnique({ where: { code: item.code } });
    if (!existing) {
      await prisma.catalogItem.create({
        data: {
          ...item,
          campaignId: null,
          categoryId: null,
          active: true,
        },
      });
      console.log(`[ensure-seed] catalog item created: ${item.code}`);
    }
  }
}

async function cleanupLegacyGenelKatalogDump() {
  const genelDump = await prisma.catalogCampaign.findFirst({
    where: { name: "Genel Katalog" },
    orderBy: { createdAt: "asc" },
  });
  if (!genelDump) return;

  const detached = await prisma.catalogItem.updateMany({
    where: { campaignId: genelDump.id },
    data: { campaignId: null, categoryId: null },
  });
  if (detached.count > 0) {
    console.log(
      `[ensure-seed] detached ${detached.count} product item(s) from Genel Katalog`
    );
  }
  await prisma.catalogCampaign.update({
    where: { id: genelDump.id },
    data: { active: false },
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn("[ensure-seed] DATABASE_URL missing — skipped");
    return;
  }

  if (skip) {
    console.log("[ensure-seed] SKIP_SEED=1 — skipped");
    return;
  }

  console.log("[ensure-seed] starting...");

  const userCount = await prisma.user.count().catch(() => 0);
  const isEmpty = userCount === 0;
  const bootstrap = forceSeed || isEmpty;
  const resetPassword = forcePasswords || isEmpty;

  if (bootstrap) {
    console.log(
      `[ensure-seed] bootstrap mode (${isEmpty ? "empty DB" : "FORCE_SEED=1"})`
    );
  } else {
    console.log(
      "[ensure-seed] maintenance mode — will not recreate Kadıköy / Demir Baş / demo data"
    );
  }

  await ensureAdmins({ resetPassword });

  try {
    // Structural defs: create-only missing rows (safe on every deploy)
    await seedStructuralDefinitions();
    await cleanupLegacyGenelKatalogDump();

    // Demo store + catalog ONLY on empty DB or FORCE_SEED
    if (bootstrap) {
      await seedDemoStoreAndCatalog();
    }
  } catch (e) {
    console.error(
      "[ensure-seed] definitions/store skipped (run prisma db push):",
      e?.message || e
    );
  }

  console.log("[ensure-seed] done");
}

main()
  .catch((e) => {
    console.error("[ensure-seed] FAILED:", e?.message || e);
    process.exitCode = 0;
  })
  .finally(() => prisma.$disconnect());
