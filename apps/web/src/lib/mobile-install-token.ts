import { createHmac, timingSafeEqual } from "crypto";

const IOS_TOKEN_KEY = "ios";
const SECRET = process.env.MOBILE_INSTALL_SECRET ?? process.env.JWT_SECRET ?? "dev-mobile-install";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createMobileInstallToken(): string {
  const exp = Date.now() + TTL_MS;
  const payload = `${IOS_TOKEN_KEY}.${exp}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyMobileInstallToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) return false;
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const expected = sign(payload);
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }
    const [key, expStr] = payload.split(".");
    if (key !== IOS_TOKEN_KEY || !expStr) return false;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function getPublicBaseUrl(): string {
  const url = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export function buildIosInstallLink(): string {
  const token = createMobileInstallToken();
  const manifestUrl = `${getPublicBaseUrl()}/api/v1/mobile-install/ios/manifest.plist?token=${encodeURIComponent(token)}`;
  return `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;
}
