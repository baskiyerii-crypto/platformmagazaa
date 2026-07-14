type CacheEntry<T> = { data: T; at: number };

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string, ttlMs: number): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ttlMs) {
    store.delete(key);
    return null;
  }
  return hit.data as T;
}

export function setCached<T>(key: string, data: T) {
  store.set(key, { data, at: Date.now() });
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export async function fetchCached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = getCached<T>(key, ttlMs);
  if (cached !== null) return cached;
  const data = await fetcher();
  setCached(key, data);
  return data;
}
