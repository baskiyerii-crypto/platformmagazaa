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
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
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

export async function ensureServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Bu tarayıcı service worker desteklemiyor.");
  }
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;

  if (!registration.active) {
    await new Promise<void>((resolve) => {
      const worker = registration.installing || registration.waiting;
      if (!worker) {
        resolve();
        return;
      }
      if (worker.state === "activated") {
        resolve();
        return;
      }
      worker.addEventListener("statechange", () => {
        if (worker.state === "activated" || worker.state === "installed") resolve();
      });
      // Don't hang forever on broken SW installs
      setTimeout(() => resolve(), 8000);
    });
  }

  return registration;
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
      message:
        "iPhone'da önce Ana Ekrana Ekle yapın, uygulamayı o ikondan açın, sonra Bildirimleri etkinleştirin.",
    };
  }

  let permission = Notification.permission;
  if (permission === "default" && requestPermission) {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return {
        ok: false,
        state: "idle",
        message: "Bildirim izni istenemedi. Tarayıcı ayarlarını kontrol edin.",
      };
    }
  }

  if (permission !== "granted") {
    return {
      ok: false,
      state: permission === "denied" ? "denied" : "idle",
      message:
        permission === "denied"
          ? "Bildirim izni kapalı. Tarayıcı site ayarlarından bu siteye izin verin, sonra tekrar deneyin."
          : requestPermission
            ? "Bildirim izni verilmedi. Tekrar deneyin ve İzin Ver seçin."
            : undefined,
    };
  }

  let registration: ServiceWorkerRegistration;
  try {
    registration = await ensureServiceWorkerRegistration();
  } catch (error) {
    return {
      ok: false,
      state: "idle",
      message: error instanceof Error ? error.message : "Service worker kaydı başarısız.",
    };
  }

  const keyRes = await fetch("/api/v1/web-push/public-key", { credentials: "same-origin" });
  const keyJson = await keyRes.json().catch(() => ({}));
  if (!keyRes.ok || !keyJson.publicKey) {
    return {
      ok: false,
      state: "idle",
      message:
        keyJson.error ??
        "Web Push yapılandırması eksik. Coolify’da VAPID_PUBLIC_KEY ve VAPID_PRIVATE_KEY tanımlayın.",
    };
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyJson.publicKey),
      });
    } catch (error) {
      // Stale subscription / key mismatch — clear and retry once
      const old = await registration.pushManager.getSubscription();
      if (old) {
        try {
          await old.unsubscribe();
        } catch {
          /* ignore */
        }
      }
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyJson.publicKey),
        });
      } catch (retryError) {
        return {
          ok: false,
          state: "idle",
          message:
            retryError instanceof Error
              ? `Abonelik oluşturulamadı: ${retryError.message}`
              : error instanceof Error
                ? `Abonelik oluşturulamadı: ${error.message}`
                : "Bildirim aboneliği oluşturulamadı.",
        };
      }
    }
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return {
      ok: false,
      state: "idle",
      message: "Tarayıcı abonelik anahtarlarını vermedi. Sayfayı yenileyip tekrar deneyin.",
    };
  }

  const saveRes = await fetch("/api/v1/web-push/subscriptions", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      expirationTime: json.expirationTime ?? null,
    }),
  });
  const saveJson = await saveRes.json().catch(() => ({}));
  if (!saveRes.ok) {
    return {
      ok: false,
      state: "idle",
      message: saveJson.error ?? `Bildirim aboneliği kaydedilemedi (${saveRes.status}).`,
    };
  }

  return {
    ok: true,
    state: "enabled",
    message: "Bildirimler açıldı. Yeni bildirimler cihazınızın varsayılan sesiyle gelir.",
  };
}
