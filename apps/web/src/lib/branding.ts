import { readFile, writeFile, access } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "@magaza/database";
import { deleteUploadedFile, ensureUploadDir, findUploadFile } from "@/lib/upload";

export const APP_LOGO_SOURCE_REF = "APP_LOGO";

export function getPublicBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function getBrandingIconUrl(size: 192 | 512 | 180, version?: string | null): string {
  const segment = size === 180 ? "apple-touch-icon" : String(size);
  const base = `/api/v1/branding/icon/${segment}`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
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
  const filePath = await findUploadFile(filename);
  if (!filePath) return null;
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

export async function getBrandingLogoStatus() {
  const logo = await getActiveAppLogo();
  if (!logo) {
    return { logoUrl: null as string | null, updatedAt: null as string | null, fileExists: false };
  }
  const filename = path.basename(logo.url.split("?")[0] ?? logo.url);
  const filePath = await findUploadFile(filename);
  return {
    logoUrl: logo.url,
    updatedAt: logo.createdAt.toISOString(),
    fileExists: Boolean(filePath),
  };
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
      <rect width="${size}" height="${size}" fill="url(#g)"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="700"
        font-size="${Math.round(size * 0.42)}" fill="#ffffff">R</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Windows/Chrome shortcuts break on transparent icons — always flatten to opaque PNG. */
export async function renderOpaqueIcon(buffer: Buffer, size: number): Promise<Buffer> {
  const bg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0f172a"/>
    </svg>`
  );
  const resized = await sharp(buffer)
    .rotate()
    .resize(size, size, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  return sharp(bg)
    .composite([{ input: resized, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

export async function getBrandingIconBuffer(size: 192 | 512 | 180 | 96 | 48): Promise<Buffer> {
  try {
    const logo = await getActiveAppLogo();
    if (logo?.url) {
      const buffer = await readLogoFileBuffer(logo.url);
      if (buffer) {
        return renderOpaqueIcon(buffer, size);
      }
    }
  } catch (e) {
    console.error("[branding] icon render failed, using default:", e);
  }
  return generateDefaultIconPng(size);
}

const BRAND_ICON_FILES = [
  { size: 48 as const, name: "brand-icon-48.png" },
  { size: 96 as const, name: "brand-icon-96.png" },
  { size: 180 as const, name: "brand-icon-180.png" },
  { size: 192 as const, name: "brand-icon-192.png" },
  { size: 512 as const, name: "brand-icon-512.png" },
];

async function writeStableBrandIcons(sourcePng: Buffer) {
  const uploadDir = await ensureUploadDir();
  for (const { size, name } of BRAND_ICON_FILES) {
    const icon = await renderOpaqueIcon(sourcePng, size);
    await writeFile(path.join(uploadDir, name), icon);
  }
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

  const square = await renderOpaqueIcon(buffer, 512);

  await writeFile(path.join(uploadDir, filename), square);
  try {
    await access(path.join(uploadDir, filename));
  } catch {
    throw new Error(
      "Logo dosyası diske yazılamadı. Coolify Persistent Storage yolunun /app/uploads olduğundan emin olun."
    );
  }

  // Stable filenames Chrome/Windows can cache for PWA shortcuts
  await writeStableBrandIcons(square);

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
