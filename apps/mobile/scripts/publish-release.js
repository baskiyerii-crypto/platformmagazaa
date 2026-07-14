/**
 * EAS build sonrası APK/IPA dosyasını sunucuya yayınlar.
 *
 * Kullanım:
 *   node apps/mobile/scripts/publish-release.js android /path/to/app.apk
 *   node apps/mobile/scripts/publish-release.js ios /path/to/app.ipa
 *
 * Opsiyonel: --version 1.0.1 --build 2
 */
const fs = require("fs");
const path = require("path");

const platformArg = process.argv[2]?.toLowerCase();
const fileArg = process.argv[3];

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

if (!platformArg || !fileArg || !["android", "ios"].includes(platformArg)) {
  console.error("Kullanım: node publish-release.js <android|ios> <dosya-yolu> [--version 1.0.0] [--build 1]");
  process.exit(1);
}

if (!fs.existsSync(fileArg)) {
  console.error("Dosya bulunamadı:", fileArg);
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, "../../..");
const uploadDir = process.env.UPLOAD_DIR ?? "uploads";
const releasesRoot = path.join(repoRoot, "apps", "web", uploadDir, "releases");
const manifestPath = path.join(releasesRoot, "manifest.json");

const targetDir = path.join(releasesRoot, platformArg);
const targetName = platformArg === "android" ? "magaza.apk" : "magaza.ipa";
const targetPath = path.join(targetDir, targetName);

let manifest = {};
if (fs.existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    manifest = {};
  }
}

let version = getArg("--version");
let buildNumber = Number(getArg("--build") ?? "1");

if (!version) {
  try {
    const appConfigPath = path.join(repoRoot, "apps", "mobile", "app.config.ts");
    const src = fs.readFileSync(appConfigPath, "utf8");
    const match = src.match(/version:\s*["']([^"']+)["']/);
    version = match?.[1] ?? "1.0.0";
  } catch {
    version = "1.0.0";
  }
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(path.resolve(fileArg), targetPath);

const entry = {
  version,
  buildNumber,
  fileName: targetName,
  updatedAt: new Date().toISOString(),
};

if (platformArg === "android") {
  manifest.android = entry;
} else {
  manifest.ios = entry;
}

fs.mkdirSync(releasesRoot, { recursive: true });
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`Yayınlandı: ${targetPath}`);
console.log(`Sürüm: ${version} (build ${buildNumber})`);
console.log("Yönetici paneli → Mobil Uygulama sayfasından indirilebilir.");
