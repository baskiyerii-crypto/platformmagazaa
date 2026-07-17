function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export type WebPushState = "idle" | "loading" | "enabled" | "denied" | "unsupported";

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function canUseWebPush() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function syncWebPushSubscription(requestPermission = false): Promise<{
  ok: boolean;
  state: WebPushState;
  message?: string;
}> {
  if (!canUseWebPush()) {
    return { ok: false, state: "unsupported", message: "Bu cihaz web bildirimlerini desteklemiyor." };
  }

  if (isIosDevice() && !isStandaloneMode()) {
    return {
      ok: false,
      state: "idle",
      message: "iPhone'da önce Safari'den Ana Ekrana Ekle yapın, sonra uygulamayı oradan açıp bildirimleri etkinleştirin.",
    };
  }

  let permission = Notification.permission;
  if (permission === "default" && requestPermission) {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    return {
      ok: false,
      state: permission === "denied" ? "denied" : "idle",
      message:
        permission === "denied"
          ? "Bildirim izni kapalı. Tarayıcı veya sistem ayarlarından bu siteye izin verin."
          : undefined,
    };
  }

  const keyRes = await fetch("/api/v1/web-push/public-key");
  const keyJson = await keyRes.json();
  if (!keyRes.ok || !keyJson.publicKey) {
    return {
      ok: false,
      state: "idle",
      message: keyJson.error ?? "Web Push yapılandırması eksik. Yöneticiye VAPID anahtarlarını kontrol ettirin.",
    };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyJson.publicKey),
    });
  }

  const json = subscription.toJSON();
  const saveRes = await fetch("/api/v1/web-push/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      expirationTime: json.expirationTime ?? null,
    }),
  });
  const saveJson = await saveRes.json();
  if (!saveRes.ok) {
    return {
      ok: false,
      state: "idle",
      message: saveJson.error ?? "Bildirim aboneliği kaydedilemedi.",
    };
  }

  return {
    ok: true,
    state: "enabled",
    message: "Bildirimler açıldı. Yeni bildirimler cihazınızın varsayılan sesiyle gelir.",
  };
}
