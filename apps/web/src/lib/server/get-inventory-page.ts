import { prisma } from "@magaza/database";
import { paginatedResponse } from "@magaza/shared";
import { fetchInventoryPageFromExport } from "@/lib/server/inventory-export-data";

const DEFAULT_LIMIT = 24;

export async function getInventoryPage(options?: {
  page?: number;
  limit?: number;
  storeId?: string;
  type?: string;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const skip = (page - 1) * limit;
  const take = limit;
  const storeFilter = options?.storeId || undefined;
  const type = options?.type || undefined;

  const vitrinWhere = storeFilter ? { avmEntry: { storeId: storeFilter } } : {};
  const outdoorWhere = storeFilter ? { storeId: storeFilter } : {};
  const signageWhere = storeFilter ? { storeId: storeFilter } : {};
  const catalogWhere = storeFilter ? { storeId: storeFilter } : {};

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
        take,
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
    return paginatedResponse(items, total, page, limit);
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
        take,
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
    return paginatedResponse(items, total, page, limit);
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
        take,
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
    return paginatedResponse(items, total, page, limit);
  }

  if (type === "CATALOG_REQUEST") {
    const [catalogReqs, total] = await Promise.all([
      prisma.catalogRequest.findMany({
        where: catalogWhere,
        include: {
          store: { select: { id: true, name: true } },
          catalogItem: { select: { id: true, name: true, referenceImageUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.catalogRequest.count({ where: catalogWhere }),
    ]);
    const items = catalogReqs.map((r) => ({
      id: r.id,
      type: "CATALOG_REQUEST" as const,
      store: r.store,
      label: `${r.store.name} · ${r.catalogItem.name}`,
      quantity: r.quantity,
      status: r.status,
      storeImageUrl: r.storeImageUrl,
      referenceImageUrl: r.catalogItem.referenceImageUrl,
      createdAt: r.createdAt,
    }));
    return paginatedResponse(items, total, page, limit);
  }

  const { items, total } = await fetchInventoryPageFromExport({
    storeId: storeFilter,
    type,
    skip,
    take,
  });

  return paginatedResponse(items, total, page, limit);
}

export async function getSlimStores() {
  return prisma.store.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
