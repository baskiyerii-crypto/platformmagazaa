export const queryKeys = {
  stores: {
    slim: ["stores", "slim"] as const,
  },
  definitions: ["definitions"] as const,
  inventory: (filters: { storeId?: string; type?: string; search?: string; page?: number }) =>
    ["inventory", filters] as const,
  dashboard: ["dashboard"] as const,
};
