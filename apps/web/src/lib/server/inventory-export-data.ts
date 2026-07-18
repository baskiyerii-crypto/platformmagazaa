import { prisma } from "@magaza/database";
import {
  buildInventoryWheres,
  INVENTORY_EXPORT_MAX,
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
  reyon: string;
  en: string;
  boy: string;
  adet: string;
  status: string;
  imageUrl: string | null;
  createdAt: Date;
  kind?: string;
  camEn?: number | null;
  camBoy?: number | null;
};

export async function fetchInventoryForExport(
  options: InventoryFilterOptions
): Promise<InventoryExportRow[]> {
  const type = options.type || undefined;
  const { vitrinWhere, outdoorWhere, signageWhere } = buildInventoryWheres(options);

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
      take: INVENTORY_EXPORT_MAX,
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
        reyon: "",
        en: String(v.en),
        boy: String(v.boy),
        adet: "1",
        status: "",
        imageUrl: v.gorselUrl,
        createdAt: v.createdAt,
        kind: v.kind,
        camEn: v.camEn,
        camBoy: v.camBoy,
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
      take: INVENTORY_EXPORT_MAX,
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
        reyon: "",
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
        reyonCategory: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: INVENTORY_EXPORT_MAX,
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
        reyon: s.reyonCategory?.name ?? "",
        en: String(s.en),
        boy: String(s.boy),
        adet: String(s.adet),
        status: "",
        imageUrl: s.gorselUrl,
        createdAt: s.createdAt,
      });
    }
  }

  return rows
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, INVENTORY_EXPORT_MAX);
}

export function formatExportFilterSummary(options: InventoryFilterOptions): string {
  const parts: string[] = [];
  if (options.storeId) parts.push(`Mağaza filtresi aktif`);
  if (options.type) parts.push(`Tür: ${INVENTORY_TYPE_LABELS[options.type] ?? options.type}`);
  if (options.search) parts.push(`Arama: ${options.search}`);
  return parts.length ? parts.join(" · ") : "Tüm görsel envanter kayıtları";
}

export function exportRowToApiItem(row: InventoryExportRow) {
  let label = `${row.storeName} · ${row.label}`;
  if (row.type === "AVM_VITRIN") {
    label = `${row.storeName} · ${row.subtype} · ${row.label}`;
  } else if (row.type === "STORE_SIGNAGE") {
    label = [row.storeName, row.subtype, row.konum, row.reyon]
      .filter(Boolean)
      .join(" · ");
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
    adet: row.adet ? Number(row.adet) : undefined,
    konum: row.konum || undefined,
    reyon: row.reyon || undefined,
    kind: row.kind,
    camEn: row.camEn,
    camBoy: row.camBoy,
    gorselUrl: row.imageUrl,
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
    truncated: all.length >= INVENTORY_EXPORT_MAX,
    exportMax: INVENTORY_EXPORT_MAX,
  };
}
