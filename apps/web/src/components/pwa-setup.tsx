"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell, Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function PwaSetup() {
  const { status } = useSession();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissedInstall, setDismissedInstall] = useState(false);
  const [dismissedIos, setDismissedIos] = useState(false);
  const [pushState, setPushState] = useState<"idle" | "loading" | "enabled" | "denied" | "unsupported">("idle");
  const [pushMessage, setPushMessage] = useState("");

  const ios = useMemo(() => isIosDevice(), []);
  const standalone = useMemo(() => isStandaloneMode(), []);

  const syncPushSubscription = useCallback(async (requestPermission = false) => {
    if (status !== "authenticated") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushState("unsupported");
      return;
    }

    if (ios && !standalone) return;

    let permission = Notification.permission;
    if (permission === "default" && requestPermission) {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      if (requestPermission) {
        setPushState("denied");
        setPushMessage("Bildirim izni verilmedi. Telefon ayarlarından izin verebilirsiniz.");
      }
      return;
    }

    const keyRes = await fetch("/api/v1/web-push/public-key");
    const keyJson = await keyRes.json();
    if (!keyRes.ok || !keyJson.publicKey) return;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyJson.publicKey),
      });
    }

    const json = subscription.toJSON();
    await fetch("/api/v1/web-push/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
        expirationTime: json.expirationTime ?? null,
      }),
    });
    setPushState("enabled");
  }, [ios, standalone, status]);

  const enablePush = useCallback(async () => {
    if (status !== "authenticated") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushState("unsupported");
      setPushMessage("Bu cihaz web bildirimlerini desteklemiyor.");
      return;
    }

    if (ios && !standalone) {
      setPushMessage("iPhone'da önce Safari'den Ana Ekrana Ekle yapın, sonra uygulamayı oradan açıp bildirimleri etkinleştirin.");
      return;
    }

    setPushState("loading");
    setPushMessage("");

    try {
      await syncPushSubscription(true);
      if (Notification.permission === "granted") {
        setPushMessage("Bildirimler açıldı. Yeni bildirimler cihazınızın varsayılan sesiyle gelir.");
      }
    } catch (error) {
      setPushState("idle");
      setPushMessage(error instanceof Error ? error.message : "Bildirimler açılamadı");
    }
  }, [ios, standalone, status, syncPushSubscription]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!("Notification" in window)) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "granted") {
      void syncPushSubscription(false);
    } else if (Notification.permission === "denied") {
      setPushState("denied");
    } else {
      setPushState("idle");
    }
  }, [status, syncPushSubscription]);

  useEffect(() => {
    if (status === "unauthenticated") {
      navigator.serviceWorker?.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => {
          if (!subscription) return;
          return fetch("/api/v1/web-push/subscriptions", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
        })
        .catch(() => {});
    }
  }, [status]);

  async function installApp() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstallEvent(null);
    }
  }

  if (status !== "authenticated") return null;

  const showAndroidInstall = !!installEvent && !dismissedInstall && !standalone;
  const showIosGuide = ios && !standalone && !dismissedIos;
  const showPushCta =
    pushState === "idle" || pushState === "denied" || pushState === "loading";

  if (!showAndroidInstall && !showIosGuide && !showPushCta && !pushMessage) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-lg flex-col gap-2">
      {showAndroidInstall && (
        <div className="rounded-2xl border bg-card p-4 shadow-lg">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">Uygulamayı ana ekrana ekle</div>
              <p className="mt-1 text-sm text-muted-foreground">
                WhatsApp linkinden açtığınız gibi uygulama gibi kullanın.
              </p>
            </div>
            <button type="button" onClick={() => setDismissedInstall(true)} aria-label="Kapat">
              <X className="h-4 w-4" />
            </button>
          </div>
          <Button className="w-full" onClick={installApp}>
            <Download className="mr-2 h-4 w-4" />
            Ana ekrana ekle
          </Button>
        </div>
      )}

      {showIosGuide && (
        <div className="rounded-2xl border bg-card p-4 shadow-lg">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">iPhone: Ana Ekrana Ekle</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Safari&apos;de Paylaş <Share className="inline h-3.5 w-3.5" /> → Ana Ekrana Ekle. Sonra uygulamayı oradan açıp bildirimleri etkinleştirin.
              </p>
            </div>
            <button type="button" onClick={() => setDismissedIos(true)} aria-label="Kapat">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showPushCta && (
        <div className="rounded-2xl border bg-card p-4 shadow-lg">
          <div className="mb-2 font-semibold">Bildirimleri aç</div>
          <p className="mb-3 text-sm text-muted-foreground">
            Mobil uygulamadaki bildirimler web/PWA sürümünde de gelsin.
          </p>
          <Button className="w-full" onClick={enablePush} disabled={pushState === "loading"}>
            <Bell className="mr-2 h-4 w-4" />
            {pushState === "loading" ? "Açılıyor..." : "Bildirimleri etkinleştir"}
          </Button>
          {pushMessage && <p className="mt-2 text-xs text-muted-foreground">{pushMessage}</p>}
        </div>
      )}

      {pushState === "enabled" && pushMessage && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {pushMessage}
        </div>
      )}
    </div>
  );
}
