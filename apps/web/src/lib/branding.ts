import { readFile, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "@magaza/database";
import { deleteUploadedFile, ensureUploadDir } from "@/lib/upload";

export const APP_LOGO_SOURCE_REF = "APP_LOGO";

export function getPublicBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function getBrandingIconUrl(size: 192 | 512 | 180): string {
  const segment = size === 180 ? "apple-touch-icon" : String(size);
  return `/api/v1/branding/icon/${segment}`;
}

export function getBrandingIconAbsoluteUrl(size: 192 | 512 | 180): string {
  return `${getPublicBaseUrl()}${getBrandingIconUrl(size)}`;
}

export async function getActiveAppLogo() {
  return prisma.mediaAsset.findFirst({
    where: { sourceRef: APP_LOGO_SOURCE_REF },
    orderBy: { createdAt: "desc" },
  });
}

async function readLogoFileBuffer(url: string): Promise<Buffer | null> {
  const filename = path.basename(url.split("?")[0] ?? url);
  const uploadDir = await ensureUploadDir();
  const fullPath = path.join(uploadDir, filename);
  try {
    return await readFile(fullPath);
  } catch {
    return null;
  }
}

export async function generateDefaultIconPng(size: number): Promise<Buffer> {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2563eb"/>
          <stop offset="100%" style="stop-color:#1e3a8a"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#g)"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="700"
        font-size="${Math.round(size * 0.42)}" fill="#ffffff">M</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function getBrandingIconBuffer(size: 192 | 512 | 180): Promise<Buffer> {
  const logo = await getActiveAppLogo();
  if (logo?.url) {
    const buffer = await readLogoFileBuffer(logo.url);
    if (buffer) {
      return sharp(buffer)
        .rotate()
        .resize(size, size, { fit: "cover", position: "centre" })
        .png()
        .toBuffer();
    }
  }
  return generateDefaultIconPng(size);
}

export async function saveAppLogo(file: File, createdById: string): Promise<string> {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error("Sadece JPG, PNG ve WebP dosyaları yüklenebilir");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Dosya boyutu 10 MB'dan küçük olmalı");
  }

  const previous = await prisma.mediaAsset.findMany({
    where: { sourceRef: APP_LOGO_SOURCE_REF },
    select: { id: true, url: true },
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadDir = await ensureUploadDir();
  const id = `logo-${Date.now()}`;
  const filename = `${id}.png`;

  const square = await sharp(buffer)
    .rotate()
    .resize(512, 512, { fit: "cover", position: "centre" })
    .png({ quality: 90 })
    .toBuffer();

  await writeFile(path.join(uploadDir, filename), square);

  const url = `/api/v1/uploads/${filename}`;

  await prisma.$transaction(async (tx) => {
    for (const item of previous) {
      await deleteUploadedFile(item.url);
      await tx.mediaAsset.delete({ where: { id: item.id } });
    }
    await tx.mediaAsset.create({
      data: {
        url,
        filename,
        category: "OTHER",
        sourceRef: APP_LOGO_SOURCE_REF,
        createdById,
      },
    });
  });

  return url;
}
