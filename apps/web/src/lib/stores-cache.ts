import { fetchCached } from "@magaza/shared";

type Store = { id: string; name: string; storeNumber?: string };

export function fetchSlimStores(): Promise<Store[]> {
  return fetchCached("stores:slim", 120_000, async () => {
    const res = await fetch("/api/v1/admin/stores?slim=1");
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  });
}
