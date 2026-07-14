import { readFile } from "fs/promises";
import sharp from "sharp";import { resolveUploadPath } from "@/lib/upload";

export type ExportImageBuffer = {
  buffer: Buffer;
  extension: "png" | "jpeg";
};

function filenameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const parts = url.split("/");
  const last = parts[parts.length - 1]?.split("?")[0];
  return last || null;
}

export async function loadThumbBuffer(
  url: string | null | undefined
): Promise<ExportImageBuffer | null> {
  const filename = filenameFromUrl(url);
  if (!filename) return null;

  const thumbPath = resolveUploadPath(filename, "thumb");
  const fullPath = resolveUploadPath(filename, "full");

  let filePath = thumbPath;
  try {
    await readFile(thumbPath);
  } catch {
    try {
      await readFile(fullPath);
      filePath = fullPath;
    } catch {
      return null;
    }
  }

  try {
    const buffer = await sharp(filePath)
      .resize(120, 90, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return { buffer, extension: "png" };
  } catch {
    return null;
  }
}

export function uploadFilenameFromUrl(url: string | null | undefined): string | null {
  return filenameFromUrl(url);
}

/** Tam görsel URL'si (Excel/PDF linkleri için) */
export function toAbsoluteMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const withoutThumb = url.split("?")[0];
  if (withoutThumb.startsWith("http://") || withoutThumb.startsWith("https://")) {
    return withoutThumb;
  }
  const base = (
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}${withoutThumb.startsWith("/") ? withoutThumb : `/${withoutThumb}`}`;
}
