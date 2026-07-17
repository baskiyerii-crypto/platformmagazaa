"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell, Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/components/pwa-install-context";
import {
  canUseWebPush,
  isIosDevice,
  syncWebPushSubscription,
  type WebPushState,
} from "@/lib/web-push-client";

export function PwaSetup() {
  const { status } = useSession();
  const { installEvent, standalone, installApp, ios } = usePwaInstall();
  const [dismissedInstall, setDismissedInstall] = useState(false);
  const [dismissedIos, setDismissedIos] = useState(false);
  const [pushState, setPushState] = useState<WebPushState>("idle");
  const [pushMessage, setPushMessage] = useState("");

  const desktop = useMemo(() => !isIosDevice(), []);

  const syncPushSubscription = useCallback(async (requestPermission = false) => {
    if (status !== "authenticated") return;
    const result = await syncWebPushSubscription(requestPermission);
    setPushState(result.state);
    if (result.message) setPushMessage(result.message);
    return result;
  }, [status]);

  const enablePush = useCallback(async () => {
    if (status !== "authenticated") return;
    if (!canUseWebPush()) {
      setPushState("unsupported");
      setPushMessage("Bu cihaz web bildirimlerini desteklemiyor.");
      return;
    }

    setPushState("loading");
    setPushMessage("");

    try {
      const result = await syncPushSubscription(true);
      if (!result?.ok && result?.message) {
        setPushMessage(result.message);
      }
    } catch (error) {
      setPushState("idle");
      setPushMessage(error instanceof Error ? error.message : "Bildirimler açılamadı");
    }
  }, [status, syncPushSubscription]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!canUseWebPush()) {
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
          <Button className="w-full" onClick={() => void installApp()}>
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
            {desktop
              ? "PC Chrome veya Edge'de bildirimleri açın; yeni duyuru ve talepler masaüstü sistem bildirimi olarak gelir."
              : "Mobil uygulamadaki bildirimler web/PWA sürümünde de gelsin."}
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
