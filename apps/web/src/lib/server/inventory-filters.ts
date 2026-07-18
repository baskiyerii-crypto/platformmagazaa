export type InventoryFilterOptions = {
  storeId?: string;
  type?: string;
  search?: string;
};

export function buildInventoryWheres(options: InventoryFilterOptions) {
  const storeFilter = options.storeId || undefined;
  const search = options.search?.trim();

  const searchVitrin = search
    ? {
        OR: [
          { avmEntry: { store: { name: { contains: search, mode: "insensitive" as const } } } },
          { avmEntry: { subType: { name: { contains: search, mode: "insensitive" as const } } } },
        ],
      }
    : {};

  const searchOutdoor = search
    ? {
        OR: [
          { store: { name: { contains: search, mode: "insensitive" as const } } },
          { subType: { name: { contains: search, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const searchSignage = search
    ? {
        OR: [
          { store: { name: { contains: search, mode: "insensitive" as const } } },
          { subType: { name: { contains: search, mode: "insensitive" as const } } },
          { placement: { name: { contains: search, mode: "insensitive" as const } } },
        ],
      }
    : {};

  return {
    vitrinWhere: {
      ...(storeFilter ? { avmEntry: { storeId: storeFilter } } : {}),
      ...searchVitrin,
    },
    outdoorWhere: {
      ...(storeFilter ? { storeId: storeFilter } : {}),
      ...searchOutdoor,
    },
    signageWhere: {
      ...(storeFilter ? { storeId: storeFilter } : {}),
      ...searchSignage,
    },
  };
}

export const INVENTORY_TYPE_LABELS: Record<string, string> = {
  AVM_VITRIN: "AVM Vitrin",
  OUTDOOR: "Açık Hava",
  STORE_SIGNAGE: "Mağaza İçi",
};

/** Soft per-type cap for inventory exports — surfaced in export meta. */
export const INVENTORY_EXPORT_MAX = 5000;
