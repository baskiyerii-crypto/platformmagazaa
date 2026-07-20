import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, normalizeMediaUrl } from "@magaza/shared";
import { fetchInventoryPageFromExport } from "@/lib/server/inventory-export-data";
import { buildInventoryWheres } from "@/lib/server/inventory-filters";

function buildStoreFilter(storeId: string | null, authStoreId?: string | null) {
  return storeId ?? authStoreId ?? undefined;
}

function withNormalizedImage<T extends { gorselUrl?: string | null }>(item: T): T {
  return {
    ...item,
    gorselUrl: normalizeMediaUrl(item.gorselUrl) ?? item.gorselUrl,
  };
}

export const GET = withAuth(
  async (request, auth) => {
    const { searchParams } = new URL(request.url);
    const fetchAll = searchParams.get("limit") === "all";
    const parsed = parsePagination(searchParams, 100);
    const page = fetchAll ? 1 : parsed.page;
    const skip = fetchAll ? 0 : parsed.skip;
    const take = fetchAll ? undefined : parsed.take;
    const limit = fetchAll ? Number.MAX_SAFE_INTEGER : parsed.limit;

    const storeFilter = buildStoreFilter(
      searchParams.get("storeId"),
      auth.role === "STORE" ? auth.storeId : null
    );
    const type = searchParams.get("type");
    const search = searchParams.get("search")?.trim();

    const { vitrinWhere, outdoorWhere, signageWhere } = buildInventoryWheres({
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
          ...(take != null ? { take } : {}),
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
      return NextResponse.json(
        paginatedResponse(items.map(withNormalizedImage), total, page, fetchAll ? Math.max(total, 1) : limit)
      );
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
        type: "OUTDOOR",
        store: o.store,
        label: `${o.store.name} · ${o.subType.name}`,
        en: o.en,
        boy: o.boy,
        adet: o.adet,
        gorselUrl: o.gorselUrl,
        createdAt: o.createdAt,
      }));
      return NextResponse.json(
        paginatedResponse(items.map(withNormalizedImage), total, page, fetchAll ? Math.max(total, 1) : limit)
      );
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
        type: "STORE_SIGNAGE",
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
        adet: s.adet,
        gorselUrl: s.gorselUrl,
        createdAt: s.createdAt,
      }));
      return NextResponse.json(
        paginatedResponse(items.map(withNormalizedImage), total, page, fetchAll ? Math.max(total, 1) : limit)
      );
    }

    const { items, total } = await fetchInventoryPageFromExport({
      storeId: storeFilter,
      search,
      skip: fetchAll ? 0 : skip,
      take: fetchAll ? Number.MAX_SAFE_INTEGER : (take ?? 100),
    });

    return NextResponse.json(
      paginatedResponse(
        items.map(withNormalizedImage),
        total,
        page,
        fetchAll ? Math.max(total, 1) : limit
      )
    );
  },
  { adminOnly: true }
);
