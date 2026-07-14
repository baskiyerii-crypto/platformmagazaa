import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth } from "@/lib/api-auth";
import { parsePagination, paginatedResponse } from "@magaza/shared";
import { fetchInventoryPageFromExport } from "@/lib/server/inventory-export-data";
import { buildInventoryWheres } from "@/lib/server/inventory-filters";
function buildStoreFilter(storeId: string | null, authStoreId?: string | null) {
  return storeId ?? authStoreId ?? undefined;
}

export const GET = withAuth(
  async (request, auth) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take } = parsePagination(searchParams, 24);
    const storeFilter = buildStoreFilter(searchParams.get("storeId"), auth.role === "STORE" ? auth.storeId : null);
    const type = searchParams.get("type");
    const search = searchParams.get("search")?.trim();

    const { vitrinWhere, outdoorWhere, signageWhere, catalogWhere } = buildInventoryWheres({
      storeId: storeFilter,
      search,
    });
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
        entryId: v.avmEntryId,
        type: "AVM_VITRIN",
        kind: v.kind,
        store: v.avmEntry.store,
        label: `${v.avmEntry.store.name} · ${v.avmEntry.subType.name} · ${v.kind === "EKSTRA_ALAN" ? "Ekstra Alan" : "Vitrin"} ${v.siraNo}`,
        en: v.en,
        boy: v.boy,
        camEn: v.camEn,
        camBoy: v.camBoy,
        konum: v.konum,
        gorselUrl: v.gorselUrl,
        createdAt: v.createdAt,
      }));
      return NextResponse.json(paginatedResponse(items, total, page, limit));
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
        type: "OUTDOOR",
        store: o.store,
        label: `${o.store.name} · ${o.subType.name}`,
        en: o.en,
        boy: o.boy,
        adet: o.adet,
        gorselUrl: o.gorselUrl,
        createdAt: o.createdAt,
      }));
      return NextResponse.json(paginatedResponse(items, total, page, limit));
    }

    if (type === "STORE_SIGNAGE") {
      const [signage, total] = await Promise.all([
        prisma.storeSignageEntry.findMany({
          where: signageWhere,
          include: {
            store: { select: { id: true, name: true } },
            subType: { select: { name: true } },
            placement: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.storeSignageEntry.count({ where: signageWhere }),
      ]);
      const items = signage.map((s) => ({
        id: s.id,
        type: "STORE_SIGNAGE",
        store: s.store,
        label: `${s.store.name} · ${s.subType.name} · ${s.placement.name}`,
        konum: s.placement.name,
        en: s.en,
        boy: s.boy,
        adet: s.adet,
        gorselUrl: s.gorselUrl,
        createdAt: s.createdAt,
      }));
      return NextResponse.json(paginatedResponse(items, total, page, limit));
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
        type: "CATALOG_REQUEST",
        store: r.store,
        label: `${r.store.name} · ${r.catalogItem.name}`,
        quantity: r.quantity,
        status: r.status,
        storeImageUrl: r.storeImageUrl,
        referenceImageUrl: r.catalogItem.referenceImageUrl,
        createdAt: r.createdAt,
      }));
      return NextResponse.json(paginatedResponse(items, total, page, limit));
    }

    const { items, total } = await fetchInventoryPageFromExport({
      storeId: storeFilter,
      search,
      skip,
      take,
    });

    return NextResponse.json(paginatedResponse(items, total, page, limit));
  },
  { adminOnly: true }
);