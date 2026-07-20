import { prisma } from "@magaza/database";
import { paginatedResponse } from "@magaza/shared";
import { fetchInventoryPageFromExport } from "@/lib/server/inventory-export-data";

export async function getInventoryPage(options?: {
  page?: number;
  limit?: number | "all";
  storeId?: string;
  type?: string;
}) {
  const fetchAll = options?.limit === "all";
  const page = fetchAll ? 1 : (options?.page ?? 1);
  const limit = fetchAll
    ? Number.MAX_SAFE_INTEGER
    : typeof options?.limit === "number"
      ? options.limit
      : 100;
  const skip = fetchAll ? 0 : (page - 1) * limit;
  const take = fetchAll ? undefined : limit;
  const storeFilter = options?.storeId || undefined;
  const type = options?.type || undefined;

  const vitrinWhere = storeFilter ? { avmEntry: { storeId: storeFilter } } : {};
  const outdoorWhere = storeFilter ? { storeId: storeFilter } : {};
  const signageWhere = storeFilter ? { storeId: storeFilter } : {};

  if (type === "AVM_VITRIN") {
    const [vitrins, total] = await Promise.all([
      prisma.avmVitrin.findMany({
        where: vitrinWhere,
        include: {
          avmEntry: {
            include: {
              store: { select: { id: true, name: true } },
              subType: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        ...(take != null ? { take } : {}),
      }),
      prisma.avmVitrin.count({ where: vitrinWhere }),
    ]);
    const items = vitrins.map((v) => ({
      id: v.id,
      type: "AVM_VITRIN" as const,
      store: v.avmEntry.store,
      label: `${v.avmEntry.store.name} · ${v.avmEntry.subType.name} · Vitrin ${v.siraNo}`,
      en: v.en,
      boy: v.boy,
      gorselUrl: v.gorselUrl,
      createdAt: v.createdAt,
    }));
    return paginatedResponse(items, total, page, fetchAll ? Math.max(total, 1) : limit);
  }

  if (type === "OUTDOOR") {
    const [outdoor, total] = await Promise.all([
      prisma.outdoorEntry.findMany({
        where: outdoorWhere,
        include: {
          store: { select: { id: true, name: true } },
          subType: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        ...(take != null ? { take } : {}),
      }),
      prisma.outdoorEntry.count({ where: outdoorWhere }),
    ]);
    const items = outdoor.map((o) => ({
      id: o.id,
      type: "OUTDOOR" as const,
      store: o.store,
      label: `${o.store.name} · ${o.subType.name}`,
      en: o.en,
      boy: o.boy,
      gorselUrl: o.gorselUrl,
      createdAt: o.createdAt,
    }));
    return paginatedResponse(items, total, page, fetchAll ? Math.max(total, 1) : limit);
  }

  if (type === "STORE_SIGNAGE") {
    const [signage, total] = await Promise.all([
      prisma.storeSignageEntry.findMany({
        where: signageWhere,
        include: {
          store: { select: { id: true, name: true } },
          subType: { select: { name: true } },
          placement: { select: { name: true } },
          reyonCategory: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        ...(take != null ? { take } : {}),
      }),
      prisma.storeSignageEntry.count({ where: signageWhere }),
    ]);
    const items = signage.map((s) => ({
      id: s.id,
      type: "STORE_SIGNAGE" as const,
      store: s.store,
      label: [
        s.store.name,
        s.subType.name,
        s.placement.name,
        s.reyonCategory?.name ? `Reyon: ${s.reyonCategory.name}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      konum: s.placement.name,
      reyon: s.reyonCategory?.name,
      en: s.en,
      boy: s.boy,
      gorselUrl: s.gorselUrl,
      createdAt: s.createdAt,
    }));
    return paginatedResponse(items, total, page, fetchAll ? Math.max(total, 1) : limit);
  }

  const { items, total } = await fetchInventoryPageFromExport({
    storeId: storeFilter,
    type,
    skip: fetchAll ? 0 : skip,
    take: fetchAll ? Number.MAX_SAFE_INTEGER : (take ?? 100),
  });

  return paginatedResponse(items, total, page, fetchAll ? Math.max(total, 1) : limit);
}

export async function getSlimStores() {
  return prisma.store.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
