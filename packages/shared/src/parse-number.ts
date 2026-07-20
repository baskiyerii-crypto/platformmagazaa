/**
 * Parse a form/API number field without ever producing NaN.
 * Accepts Turkish decimal comma (12,5 → 12.5). Empty/invalid → null.
 */
export function parseNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  // "1.234,5" or "12,5" → normalize
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Required positive number; returns Turkish error message or null if ok. */
export function requirePositiveNumber(
  value: unknown,
  fieldLabel: string
): { value: number } | { error: string } {
  const n = parseNumber(value);
  if (n == null) return { error: `${fieldLabel} geçerli bir sayı olmalı` };
  if (n <= 0) return { error: `${fieldLabel} pozitif olmalı` };
  return { value: n };
}

/** Required integer >= min; returns Turkish error message or null if ok. */
export function requireIntMin(
  value: unknown,
  fieldLabel: string,
  min = 1
): { value: number } | { error: string } {
  const n = parseNumber(value);
  if (n == null) return { error: `${fieldLabel} geçerli bir sayı olmalı` };
  if (!Number.isInteger(n) || n < min) {
    return { error: `${fieldLabel} en az ${min} olmalı` };
  }
  return { value: n };
}

/**
 * Read optional number from FormData: missing/empty → undefined (keep existing),
 * present but invalid → null (caller should error), valid → number.
 */
export function formNumberOptional(
  formData: FormData,
  key: string
): number | null | undefined {
  if (!formData.has(key)) return undefined;
  const raw = formData.get(key);
  if (raw == null || String(raw).trim() === "") return undefined;
  return parseNumber(raw);
}
