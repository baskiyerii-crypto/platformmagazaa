import { fetchCached, invalidateCache } from "@magaza/shared";

type Definitions = {
  categories: Array<{ subTypes: Array<{ id: string; name: string; code: string }> }>;
  placements: Array<{ id: string; name: string }>;
  reyonCategories: Array<{ id: string; name: string; code: string }>;
};

export function fetchDefinitions<T = Definitions>(): Promise<T> {
  return fetchCached("definitions", 300_000, () =>
    fetch("/api/v1/definitions").then((r) => r.json())
  );
}

export function invalidateDefinitionsCache() {
  invalidateCache("definitions");
}
