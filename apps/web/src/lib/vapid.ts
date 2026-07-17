import webpush from "web-push";

let configured = false;

export function getVapidPublicKey(): string | null {
  const key = process.env.VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

export function ensureVapidConfigured(): boolean {
  if (configured) return true;

  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() ??
    process.env.NEXTAUTH_URL?.trim() ??
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    "mailto:admin@reklamplatform.com.tr";

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export { webpush };
