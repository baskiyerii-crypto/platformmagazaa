import { prisma } from "@magaza/database";
import { CHANGE_REQUEST_STATUS_LABELS, CHANGE_REQUEST_STATUSES, type ChangeRequestStatus } from "@magaza/shared";
import {
  buildInventoryWheres,
  INVENTORY_TYPE_LABELS,
  type InventoryFilterOptions,
} from "@/lib/server/inventory-filters";

export type InventoryExportRow = {
  id: string;
  type: string;
  typeLabel: string;
  storeId: string;
  storeName: string;
  label: string;
  subtype: string;
  konum: string;
  en: string;
  boy: string;
  adet: string;
  status: string;
  imageUrl: string | null;
  createdAt: Date;
};

const EXPORT_MAX = 5000;

export async function fetchInventoryForExport(
  options: InventoryFilterOptions
): Promise<InventoryExportRow[]> {
  const type = options.type || undefined;
  const { vitrinWhere, outdoorWhere, signageWhere, catalogWhere } =
    buildInventoryWheres(options);

  const rows: InventoryExportRow[] = [];

  if (!type || type === "AVM_VITRIN") {
    const vitrins = await prisma.avmVitrin.findMany({
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
      take: EXPORT_MAX,
    });
    for (const v of vitrins) {
      const kindLabel = v.kind === "EKSTRA_ALAN" ? "Ekstra Alan" : "Vitrin";
      rows.push({
        id: v.id,
        type: "AVM_VITRIN",
        typeLabel: INVENTORY_TYPE_LABELS.AVM_VITRIN,
        storeId: v.avmEntry.store.id,
        storeName: v.avmEntry.store.name,
        label: `${kindLabel} ${v.siraNo}`,
        subtype: v.avmEntry.subType.name,
        konum: v.konum ?? "",
        en: String(v.en),
        boy: String(v.boy),
        adet: "1",
        status: "",
        imageUrl: v.gorselUrl,
        createdAt: v.createdAt,
      });
    }
  }

  if (!type || type === "OUTDOOR") {
    const outdoor = await prisma.outdoorEntry.findMany({
      where: outdoorWhere,
      include: {
        store: { select: { id: true, name: true } },
        subType: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: EXPORT_MAX,
    });
    for (const o of outdoor) {
      rows.push({
        id: o.id,
        type: "OUTDOOR",
        typeLabel: INVENTORY_TYPE_LABELS.OUTDOOR,
        storeId: o.store.id,
        storeName: o.store.name,
        label: o.subType.name,
        subtype: o.subType.name,
        konum: "",
        en: String(o.en),
        boy: String(o.boy),
        adet: String(o.adet),
        status: "",
        imageUrl: o.gorselUrl,
        createdAt: o.createdAt,
      });
    }
  }

  if (!type || type === "STORE_SIGNAGE") {
    const signage = await prisma.storeSignageEntry.findMany({
      where: signageWhere,
      include: {
        store: { select: { id: true, name: true } },
        subType: { select: { name: true } },
        placement: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: EXPORT_MAX,
    });
    for (const s of signage) {
      rows.push({
        id: s.id,
        type: "STORE_SIGNAGE",
        typeLabel: INVENTORY_TYPE_LABELS.STORE_SIGNAGE,
        storeId: s.store.id,
        storeName: s.store.name,
        label: s.subType.name,
        subtype: s.subType.name,
        konum: s.placement.name,
        en: String(s.en),
        boy: String(s.boy),
        adet: String(s.adet),
        status: "",
        imageUrl: s.gorselUrl,
        createdAt: s.createdAt,
      });
    }
  }

  if (!type || type === "CATALOG_REQUEST") {
    const catalogReqs = await prisma.catalogRequest.findMany({
      where: catalogWhere,
      include: {
        store: { select: { id: true, name: true } },
        catalogItem: { select: { name: true, referenceImageUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: EXPORT_MAX,
    });
    for (const r of catalogReqs) {
      rows.push({
        id: r.id,
        type: "CATALOG_REQUEST",
        typeLabel: INVENTORY_TYPE_LABELS.CATALOG_REQUEST,
        storeId: r.store.id,
        storeName: r.store.name,
        label: r.catalogItem.name,
        subtype: r.catalogItem.name,
        konum: "",
        en: "",
        boy: "",
        adet: r.quantity != null ? String(r.quantity) : "",
        status: r.status,
        imageUrl: r.storeImageUrl ?? r.catalogItem.referenceImageUrl,
        createdAt: r.createdAt,
      });
    }
  }

  return rows
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, EXPORT_MAX);
}

export function formatExportFilterSummary(options: InventoryFilterOptions): string {
  const parts: string[] = [];
  if (options.storeId) parts.push(`Mağaza filtresi aktif`);
  if (options.type) parts.push(`Tür: ${INVENTORY_TYPE_LABELS[options.type] ?? options.type}`);
  if (options.search) parts.push(`Arama: ${options.search}`);
  return parts.length ? parts.join(" · ") : "Tüm kayıtlar";
}

export function exportRowToApiItem(row: InventoryExportRow) {
  let label = `${row.storeName} · ${row.label}`;
  if (row.type === "AVM_VITRIN") {
    label = `${row.storeName} · ${row.subtype} · ${row.label}`;
  } else if (row.type === "STORE_SIGNAGE") {
    label = `${row.storeName} · ${row.subtype} · ${row.konum}`;
  } else if (row.type === "OUTDOOR") {
    label = `${row.storeName} · ${row.subtype}`;
  }

  return {
    id: row.id,
    type: row.type,
    label,
    store: { id: row.storeId, name: row.storeName },
    en: row.en ? Number(row.en) : undefined,
    boy: row.boy ? Number(row.boy) : undefined,
    konum: row.konum || undefined,
    gorselUrl: row.type !== "CATALOG_REQUEST" ? row.imageUrl : undefined,
    storeImageUrl: row.type === "CATALOG_REQUEST" ? row.imageUrl : undefined,
    referenceImageUrl: row.type === "CATALOG_REQUEST" ? row.imageUrl : undefined,
    status: row.status ? (CHANGE_REQUEST_STATUSES.includes(row.status as ChangeRequestStatus) ? row.status as ChangeRequestStatus : undefined) : undefined,
    createdAt: row.createdAt,
  };
}

export async function fetchInventoryPageFromExport(
  options: InventoryFilterOptions & { skip: number; take: number }
) {
  const all = await fetchInventoryForExport(options);
  const total = all.length;
  const slice = all.slice(options.skip, options.skip + options.take);
  return {
    items: slice.map(exportRowToApiItem),
    total,
  };
}
