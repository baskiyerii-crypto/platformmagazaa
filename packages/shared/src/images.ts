/**
 * Normalize stored media URLs to a same-origin `/api/v1/uploads/...` path.
 * Fixes absolute URLs, `/uploads/...`, `/app/uploads/...`, missing leading slash, bare filenames.
 */
export function normalizeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const raw = String(url).trim();
  if (!raw) return null;

  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      return normalizeMediaUrl(u.pathname + u.search);
    }
  } catch {
    /* fall through */
  }

  const pathOnly = raw.split("?")[0] ?? raw;
  const query = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";

  if (pathOnly.startsWith("/api/v1/uploads/")) {
    return `/api/v1/uploads/${fileName(pathOnly.slice("/api/v1/uploads/".length))}${query}`;
  }

  if (pathOnly.startsWith("api/v1/uploads/")) {
    return `/api/v1/uploads/${fileName(pathOnly.slice("api/v1/uploads/".length))}${query}`;
  }

  // Any path containing /uploads/FILENAME (legacy disk or public paths)
  const marker = "/uploads/";
  const idx = pathOnly.replace(/\\/g, "/").lastIndexOf(marker);
  if (idx >= 0) {
    const name = fileName(pathOnly.slice(idx + marker.length));
    if (name && !name.includes("..")) {
      return `/api/v1/uploads/${name}${query}`;
    }
  }

  // Bare filename (uuid.webp / jpeg / heic / …)
  if (
    /^[\w.-]+\.(webp|jpe?g|png|gif|bmp|tiff?|heic|heif|avif)$/i.test(pathOnly) &&
    !pathOnly.includes("/") &&
    !pathOnly.includes("\\")
  ) {
    return `/api/v1/uploads/${pathOnly}${query}`;
  }

  if (!raw.startsWith("/")) return `/${raw}`;
  return raw;
}

function fileName(p: string) {
  const parts = p.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] ?? p;
}

/** Append thumb query for grid/list views */
export function thumbUrl(url: string | null | undefined): string | null {
  const normalized = normalizeMediaUrl(url);
  if (!normalized) return null;
  const base = normalized.split("?")[0] ?? normalized;
  return `${base}?size=thumb`;
}

/** Full image URL (no thumb query) for lightbox / onError fallback */
export function fullMediaUrl(url: string | null | undefined): string | null {
  const normalized = normalizeMediaUrl(url);
  if (!normalized) return null;
  return normalized.split("?")[0] ?? normalized;
}
