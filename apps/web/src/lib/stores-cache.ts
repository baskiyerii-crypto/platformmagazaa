import { fetchCached } from "@magaza/shared";

type Store = { id: string; name: string };

export function fetchSlimStores(): Promise<Store[]> {
  return fetchCached("stores:slim", 120_000, () =>
    fetch("/api/v1/admin/stores?slim=1").then((r) => r.json())
  );
}
