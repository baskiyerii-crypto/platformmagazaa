import { access, mkdir, readdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { prisma, type MediaCategory } from "@magaza/database";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function resolveUploadDir() {
  return path.isAbsolute(UPLOAD_DIR)
    ? UPLOAD_DIR
    : path.join(process.cwd(), UPLOAD_DIR);
}

/** Primary + legacy dirs (Nixpacks cwd=/app/apps/web previously wrote here). */
function candidateUploadDirs() {
  const primary = resolveUploadDir();
  const legacy = [
    path.join(process.cwd(), "uploads"),
    path.join(process.cwd(), "..", "..", "uploads"),
    "/app/uploads",
    "/app/apps/web/uploads",
  ];
  return [...new Set([primary, ...legacy.map((d) => path.resolve(d))])];
}

export type SaveUploadOptions = {
  category?: MediaCategory;
  storeId?: string | null;
  createdById?: string | null;
  sourceRef?: string | null;
};

export async function ensureUploadDir() {
  const dir = resolveUploadDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

export function resolveUploadDirPath() {
  return resolveUploadDir();
}

export async function getUploadDirStatus() {
  const resolvedDir = resolveUploadDir();
  let dirExists = false;
  let writable = false;
  let fileCount: number | null = null;
  let error: string | null = null;

  try {
    await mkdir(resolvedDir, { recursive: true });
    dirExists = true;
    const probe = path.join(resolvedDir, `.write-probe-${process.pid}`);
    await writeFile(probe, "ok");
    await unlink(probe);
    writable = true;
    const names = await readdir(resolvedDir);
    fileCount = names.filter((n) => !n.startsWith(".")).length;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    try {
      await access(resolvedDir);
      dirExists = true;
    } catch {
      dirExists = false;
    }
  }

  return {
    resolvedDir,
    dirExists,
    writable,
    fileCount,
    error,
    candidates: candidateUploadDirs(),
  };
}

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

  let uploadPath: string;
  try {
    uploadPath = await ensureUploadDir();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Upload klasörü oluşturulamadı (${resolveUploadDir()}): ${msg}. Coolify Persistent Storage yolunu /app/uploads yapın.`
    );
  }

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

  try {
    await writeFile(path.join(uploadPath, filename), resized);
    await writeFile(path.join(uploadPath, thumbFilename), thumb);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Dosya yazılamadı (${uploadPath}): ${msg}. Coolify → Persistent Storage → /app/uploads ekleyin.`
    );
  }

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
  const names = [filename, `${base}_thumb.webp`];
  for (const dir of candidateUploadDirs()) {
    for (const name of names) {
      try {
        await unlink(path.join(dir, name));
      } catch {
        /* missing file ok */
      }
    }
  }
}

export function getUploadDir() {
  return resolveUploadDir();
}

export function resolveUploadPath(filename: string, size?: "thumb" | "full") {
  const safeName = path.basename(filename);
  if (size === "thumb") {
    const base = safeName.replace(/\.[^.]+$/, "");
    return path.join(getUploadDir(), `${base}_thumb.webp`);
  }
  return path.join(getUploadDir(), safeName);
}

/** Find file on disk across primary + legacy upload directories. */
export async function findUploadFile(
  filename: string,
  size?: "thumb" | "full"
): Promise<string | null> {
  const safeName = path.basename(filename);
  const base = safeName.replace(/\.[^.]+$/, "");
  const names =
    size === "thumb"
      ? [`${base}_thumb.webp`, safeName]
      : [safeName, `${base}_thumb.webp`];

  for (const dir of candidateUploadDirs()) {
    for (const name of names) {
      const full = path.join(dir, name);
      try {
        await access(full);
        return full;
      } catch {
        /* try next */
      }
    }
  }
  return null;
}
