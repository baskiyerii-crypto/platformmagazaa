/** Append thumb query for grid/list views */
export function thumbUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes("?")) return `${url}&size=thumb`;
  return `${url}?size=thumb`;
}
