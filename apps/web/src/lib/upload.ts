import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { prisma, type MediaCategory } from "@magaza/database";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type SaveUploadOptions = {
  category?: MediaCategory;
  storeId?: string | null;
  createdById?: string | null;
  sourceRef?: string | null;
};

export async function saveUploadedFile(
  file: File,
  options?: SaveUploadOptions
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Sadece JPG, PNG ve WebP dosyaları yüklenebilir");
  }

  if (file.size > MAX_SIZE) {
    throw new Error("Dosya boyutu 10 MB'dan küçük olmalı");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const id = randomUUID();
  const filename = `${id}.webp`;
  const thumbFilename = `${id}_thumb.webp`;
  const uploadPath = path.join(process.cwd(), UPLOAD_DIR);
  await mkdir(uploadPath, { recursive: true });

  const resized = await sharp(buffer)
    .rotate()
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  const thumb = await sharp(buffer)
    .rotate()
    .resize({ width: 400, height: 400, fit: "cover" })
    .webp({ quality: 75 })
    .toBuffer();

  await writeFile(path.join(uploadPath, filename), resized);
  await writeFile(path.join(uploadPath, thumbFilename), thumb);

  const url = `/api/v1/uploads/${filename}`;

  if (options?.category) {
    await prisma.mediaAsset.create({
      data: {
        url,
        filename,
        category: options.category,
        storeId: options.storeId ?? null,
        createdById: options.createdById ?? null,
        sourceRef: options.sourceRef ?? null,
      },
    });
  }

  return url;
}

export async function deleteUploadedFile(urlOrFilename: string) {
  const filename = path.basename(urlOrFilename.split("?")[0] ?? urlOrFilename);
  const base = filename.replace(/\.[^.]+$/, "");
  const dir = getUploadDir();
  for (const name of [filename, `${base}_thumb.webp`]) {
    try {
      await unlink(path.join(dir, name));
    } catch {
      /* missing file ok */
    }
  }
}

export function getUploadDir() {
  return path.join(process.cwd(), UPLOAD_DIR);
}

export function resolveUploadPath(filename: string, size?: "thumb" | "full") {
  const safeName = path.basename(filename);
  if (size === "thumb") {
    const base = safeName.replace(/\.[^.]+$/, "");
    const thumbName = `${base}_thumb.webp`;
    return path.join(getUploadDir(), thumbName);
  }
  return path.join(getUploadDir(), safeName);
}
