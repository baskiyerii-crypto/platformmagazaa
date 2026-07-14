import type { PaginatedResponse } from "./pagination";

export function unwrapPaginated<T>(data: T[] | PaginatedResponse<T> | null | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "object" && "items" in data && Array.isArray(data.items)) {
    return data.items;
  }
  return [];
}

export function paginatedMeta(data: unknown): { hasMore: boolean; page: number } {
  if (data && typeof data === "object" && "hasMore" in data && "page" in data) {
    const d = data as PaginatedResponse<unknown>;
    return { hasMore: Boolean(d.hasMore), page: Number(d.page) || 1 };
  }
  return { hasMore: false, page: 1 };
}
