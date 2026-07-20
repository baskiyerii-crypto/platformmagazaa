/**
 * Convert any picked image (especially iPhone HEIC/HEIF) to a browser/server-friendly JPEG File.
 */
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif|avif|svg)$/i;

export function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXT.test(file.name);
}

function isHeicLike(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  const n = file.name.toLowerCase();
  return (
    t.includes("heic") ||
    t.includes("heif") ||
    n.endsWith(".heic") ||
    n.endsWith(".heif")
  );
}

async function canvasToJpeg(file: File): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
    );
    if (!blob) return null;
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return null;
  }
}

async function heicToJpeg(file: File): Promise<File | null> {
  try {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    const blob = Array.isArray(result) ? result[0] : result;
    if (!blob) return null;
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return null;
  }
}

/** Normalize for upload: HEIC→JPEG, ensure image/* File. */
export async function normalizeImageFile(file: File): Promise<File> {
  if (!isLikelyImageFile(file)) {
    throw new Error("Lütfen bir görsel dosyası seçin (JPG, PNG, HEIC, WebP, …)");
  }

  if (isHeicLike(file)) {
    const converted = (await heicToJpeg(file)) || (await canvasToJpeg(file));
    if (converted) return converted;
    // Let server try sharp/libheif
    return new File([file], file.name.replace(/\.heic$/i, ".heic"), {
      type: file.type || "image/heic",
    });
  }

  // Already JPEG/PNG/WebP/etc. — keep as-is
  if (file.type.startsWith("image/") && file.type !== "image/svg+xml") {
    return file;
  }

  // Missing/odd mime: try canvas decode
  const viaCanvas = await canvasToJpeg(file);
  if (viaCanvas) return viaCanvas;

  return file;
}
