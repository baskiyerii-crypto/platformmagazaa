import { access, readFile, stat } from "fs/promises";
import path from "path";

export type MobilePlatform = "ANDROID" | "IOS";

export type ReleaseManifestEntry = {
  version: string;
  buildNumber: number;
  fileName: string;
  updatedAt: string;
  releaseNotes?: string | null;
};

export type ReleasesManifest = {
  android?: ReleaseManifestEntry;
  ios?: ReleaseManifestEntry;
};

export type MobileReleaseInfo = ReleaseManifestEntry & {
  platform: MobilePlatform;
  fileSize: number;
  available: boolean;
};

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

const PLATFORM_FILES: Record<MobilePlatform, { subdir: string; defaultFile: string }> = {
  ANDROID: { subdir: "android", defaultFile: "magaza.apk" },
  IOS: { subdir: "ios", defaultFile: "magaza.ipa" },
};

const MIME_TYPES: Record<MobilePlatform, string> = {
  ANDROID: "application/vnd.android.package-archive",
  IOS: "application/octet-stream",
};

function releasesRoot() {
  return path.join(process.cwd(), UPLOAD_DIR, "releases");
}

function manifestPath() {
  return path.join(releasesRoot(), "manifest.json");
}

export function getMobileReleaseMime(platform: MobilePlatform): string {
  return MIME_TYPES[platform];
}

export async function readReleasesManifest(): Promise<ReleasesManifest> {
  try {
    const raw = await readFile(manifestPath(), "utf8");
    return JSON.parse(raw) as ReleasesManifest;
  } catch {
    return {};
  }
}

export function getReleaseFilePath(platform: MobilePlatform, fileName?: string): string {
  const { subdir, defaultFile } = PLATFORM_FILES[platform];
  return path.join(releasesRoot(), subdir, fileName ?? defaultFile);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function getMobileReleaseInfo(platform: MobilePlatform): Promise<MobileReleaseInfo | null> {
  const manifest = await readReleasesManifest();
  const entry = platform === "ANDROID" ? manifest.android : manifest.ios;
  const { defaultFile } = PLATFORM_FILES[platform];
  const fileName = entry?.fileName ?? defaultFile;
  const filePath = getReleaseFilePath(platform, fileName);

  if (!(await fileExists(filePath))) {
    return null;
  }

  const fileStat = await stat(filePath);
  return {
    platform,
    version: entry?.version ?? "1.0.0",
    buildNumber: entry?.buildNumber ?? 1,
    fileName,
    updatedAt: entry?.updatedAt ?? fileStat.mtime.toISOString(),
    releaseNotes: entry?.releaseNotes ?? null,
    fileSize: fileStat.size,
    available: true,
  };
}

export async function readMobileReleaseFile(platform: MobilePlatform): Promise<Buffer> {
  const info = await getMobileReleaseInfo(platform);
  if (!info) throw new Error("Dosya bulunamadı");
  return readFile(getReleaseFilePath(platform, info.fileName));
}
