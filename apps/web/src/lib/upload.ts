import { access, mkdir, readdir, writeFile, unlink, stat } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { prisma, type MediaCategory } from "@magaza/database";

const MAX_SIZE = 20 * 1024 * 1024;
const ALT_EXTS = [".webp", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tif", ".tiff", ".heic", ".heif", ".avif"];
const IMAGE_NAME_RE = /\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif|avif)$/i;

/** Empty/whitespace UPLOAD_DIR must not win over default (Coolify sometimes sets ""). */
function configuredUploadDir(): string {
  const raw = process.env.UPLOAD_DIR?.trim();
  if (raw && raw.length > 0) return raw;
  return process.env.NODE_ENV === "production" ? "/app/uploads" : "./uploads";
}

function resolveUploadDir() {
  const configured = configuredUploadDir();
  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
}

/** Primary + every legacy location we have ever written to. */
function candidateUploadDirs() {
  const primary = resolveUploadDir();
  const cwd = process.cwd();
  const legacy = [
    path.join(cwd, "uploads"),
    path.join(cwd, "apps", "web", "uploads"),
    path.join(cwd, "..", "uploads"),
    path.join(cwd, "..", "..", "uploads"),
    "/app/uploads",
    "/app/apps/web/uploads",
    "/data/uploads",
    "/var/uploads",
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
  const candidateStats: Array<{ dir: string; exists: boolean; files: number }> = [];

  for (const dir of candidateUploadDirs()) {
    try {
      await access(dir);
      const names = await readdir(dir);
      candidateStats.push({
        dir,
        exists: true,
        files: names.filter((n) => !n.startsWith(".")).length,
      });
    } catch {
      candidateStats.push({ dir, exists: false, files: 0 });
    }
  }

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
    cwd: process.cwd(),
    candidates: candidateUploadDirs(),
    candidateStats,
  };
}

export async function saveUploadedFile(
  file: File,
  options?: SaveUploadOptions
): Promise<string> {
  const type = (file.type || "").toLowerCase();
  const nameOk = IMAGE_NAME_RE.test(file.name);
  const typeOk =
    type.startsWith("image/") ||
    type === "application/octet-stream" ||
    !type;
  if (!typeOk && !nameOk) {
    throw new Error("Sadece görsel dosyaları yüklenebilir (JPG, PNG, WebP, HEIC, GIF, …)");
  }

  if (file.size > MAX_SIZE) {
    throw new Error("Dosya boyutu 20 MB'dan küçük olmalı");
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

  let resized: Buffer;
  let thumb: Buffer;
  try {
    const input = sharp(buffer, { failOn: "none" });
    const meta = await input.metadata().catch(() => null);
    if (!meta?.format && !nameOk) {
      throw new Error("Dosya görsel olarak okunamadı");
    }
    resized = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    thumb = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: 400, height: 400, fit: "cover" })
      .webp({ quality: 75 })
      .toBuffer();
  } catch (e) {
    // Fallback: decode → JPEG → WebP (helps some HEIC/odd formats)
    try {
      const jpeg = await sharp(buffer, { failOn: "none" })
        .rotate()
        .jpeg({ quality: 90 })
        .toBuffer();
      resized = await sharp(jpeg)
        .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
      thumb = await sharp(jpeg)
        .resize({ width: 400, height: 400, fit: "cover" })
        .webp({ quality: 75 })
        .toBuffer();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      throw new Error(
        `Görsel işlenemedi (iPhone HEIC dahil tüm formatlar desteklenir): ${msg}`
      );
    }
  }

  const fullPath = path.join(uploadPath, filename);
  const thumbPath = path.join(uploadPath, thumbFilename);

  try {
    await writeFile(fullPath, resized);
    await writeFile(thumbPath, thumb);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Dosya yazılamadı (${uploadPath}): ${msg}. Coolify → Persistent Storage → /app/uploads ekleyin.`
    );
  }

  // Verify read-back from the same path we will serve from
  try {
    const st = await stat(fullPath);
    if (st.size <= 0) throw new Error("yazılan dosya boş");
    const found = await findUploadFile(filename, "full");
    if (!found) {
      throw new Error(`yazıldı ama okunamadı (dir=${uploadPath}, cwd=${process.cwd()})`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Upload doğrulaması başarısız: ${msg}`);
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
  const names = [filename, `${base}_thumb.webp`, ...ALT_EXTS.map((ext) => `${base}${ext}`)];
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

function nameCandidates(filename: string, size?: "thumb" | "full"): string[] {
  const safeName = path.basename(filename.split("?")[0] ?? filename);
  const base = safeName.replace(/\.[^.]+$/, "");
  if (size === "thumb") {
    return [
      `${base}_thumb.webp`,
      safeName,
      ...ALT_EXTS.map((ext) => `${base}${ext}`),
    ];
  }
  return [
    safeName,
    ...ALT_EXTS.map((ext) => `${base}${ext}`),
    `${base}_thumb.webp`,
  ];
}

/** Find file on disk across primary + legacy upload directories. Skip empty files. */
export async function findUploadFile(
  filename: string,
  size?: "thumb" | "full"
): Promise<string | null> {
  const names = nameCandidates(filename, size);

  for (const dir of candidateUploadDirs()) {
    for (const name of [...new Set(names)]) {
      const full = path.join(dir, name);
      try {
        const st = await stat(full);
        if (st.isFile() && st.size > 0) return full;
      } catch {
        /* try next */
      }
    }
  }

  // Last resort: scan dirs for uuid prefix (extension mismatch / renamed)
  const base = path.basename(filename.split("?")[0] ?? filename).replace(/\.[^.]+$/, "");
  if (base.length >= 8) {
    for (const dir of candidateUploadDirs()) {
      try {
        const entries = await readdir(dir);
        const match = entries.find(
          (n) =>
            n.startsWith(base) &&
            (size === "thumb" ? n.includes("_thumb") : !n.includes("_thumb"))
        );
        if (match) {
          const full = path.join(dir, match);
          const st = await stat(full);
          if (st.isFile() && st.size > 0) return full;
        }
      } catch {
        /* try next dir */
      }
    }
  }

  return null;
}
