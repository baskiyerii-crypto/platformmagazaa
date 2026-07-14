export function parsePagination(searchParams: URLSearchParams, defaultLimit = 50) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? String(defaultLimit), 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    items,
    page,
    limit,
    total,
    hasMore: page * limit < total,
  };
}
