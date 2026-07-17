"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Download, MonitorSmartphone, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { usePwaInstall } from "@/components/pwa-install-context";
import {
  canUseWebPush,
  ensureServiceWorkerRegistration,
  isIosDevice,
  isStandaloneMode,
  syncWebPushSubscription,
  type WebPushState,
} from "@/lib/web-push-client";

export function AppSettingsManager() {
  const { standalone, canPromptInstall, installApp, ios } = usePwaInstall();
  const [installBusy, setInstallBusy] = useState(false);
  const [installMessage, setInstallMessage] = useState("");
  const [pushState, setPushState] = useState<WebPushState>("idle");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState("");

  const refreshPushState = useCallback(async () => {
    if (!canUseWebPush()) {
      setPushState("unsupported");
      return;
    }
    if (isIosDevice() && !isStandaloneMode()) {
      setPushState("idle");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }
    if (Notification.permission !== "granted") {
      setPushState("idle");
      return;
    }
    try {
      const reg = await ensureServiceWorkerRegistration();
      const sub = await reg.pushManager.getSubscription();
      setPushState(sub ? "enabled" : "idle");
    } catch {
      setPushState("idle");
    }
  }, []);

  useEffect(() => {
    void refreshPushState();
  }, [refreshPushState]);

  async function handleInstall() {
    setInstallBusy(true);
    setInstallMessage("");
    try {
      const outcome = await installApp();
      if (outcome === "accepted") {
        setInstallMessage("Uygulama ana ekrana / masaüstüne eklendi.");
      } else if (outcome === "dismissed") {
        setInstallMessage("Kurulum iptal edildi. Tekrar deneyebilirsiniz.");
      } else if (ios) {
        setInstallMessage("Safari’de Paylaş → Ana Ekrana Ekle yolunu kullanın.");
      } else {
        setInstallMessage(
          "Kurulum şu an hazır değil. Sayfayı yenileyip tekrar deneyin veya Chrome menü → Uygulamayı yükle."
        );
      }
    } catch (error) {
      setInstallMessage(error instanceof Error ? error.message : "Kurulum başlatılamadı");
    } finally {
      setInstallBusy(false);
    }
  }

  async function enablePush() {
    setPushBusy(true);
    setPushMessage("");
    try {
      await ensureServiceWorkerRegistration();
      const result = await syncWebPushSubscription(true);
      setPushState(result.state);
      setPushMessage(
        result.message ??
          (result.ok ? "Bildirimler açıldı." : "Bildirimler açılamadı.")
      );
    } catch (error) {
      setPushState("idle");
      setPushMessage(error instanceof Error ? error.message : "Bildirimler açılamadı");
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePush() {
    setPushBusy(true);
    setPushMessage("");
    try {
      const reg = await ensureServiceWorkerRegistration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/v1/web-push/subscriptions", {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushState("idle");
      setPushMessage("Bildirimler kapatıldı.");
    } catch (error) {
      setPushMessage(error instanceof Error ? error.message : "Bildirimler kapatılamadı");
    } finally {
      setPushBusy(false);
    }
  }

  const pushOn = pushState === "enabled";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Uygulama Ayarları"
        subtitle="Ana ekrana ekleme ve bildirim tercihleri"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ana ekrana / masaüstüne ekle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {standalone ? (
            <p className="text-sm text-muted-foreground">
              Uygulama zaten ana ekrandan / masaüstünden açık.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {ios
                  ? "iPhone’da Safari Paylaş menüsünden ekleyin; Android/PC’de buton kurulum penceresini açar."
                  : "Butona basınca tarayıcı kurulum penceresi açılır ve uygulama eklenir."}
              </p>
              <Button onClick={() => void handleInstall()} disabled={installBusy} className="w-full sm:w-auto">
                {ios ? (
                  <MonitorSmartphone className="mr-2 h-4 w-4" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {installBusy
                  ? "Ekleniyor..."
                  : canPromptInstall
                    ? "Ana ekrana ekle"
                    : ios
                      ? "Nasıl eklenir?"
                      : "Ana ekrana ekle"}
              </Button>
              {ios && !standalone ? (
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Share className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Safari → Paylaş → Ana Ekrana Ekle
                </p>
              ) : null}
              {installMessage ? (
                <p className="text-sm text-muted-foreground">{installMessage}</p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bildirimler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Duyuru ve talepler için tarayıcı / masaüstü bildirimlerini açıp kapatın.
          </p>
          {!canUseWebPush() ? (
            <p className="text-sm text-destructive">Bu cihaz web bildirimlerini desteklemiyor.</p>
          ) : isIosDevice() && !standalone ? (
            <p className="text-sm text-amber-700">
              iPhone’da önce Ana Ekrana Ekle yapın, uygulamayı o ikondan açın, sonra bildirimleri açın.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {!pushOn ? (
                <Button onClick={() => void enablePush()} disabled={pushBusy}>
                  <Bell className="mr-2 h-4 w-4" />
                  {pushBusy ? "Açılıyor..." : "Bildirimleri aç"}
                </Button>
              ) : (
                <Button variant="outline" onClick={() => void disablePush()} disabled={pushBusy}>
                  <BellOff className="mr-2 h-4 w-4" />
                  {pushBusy ? "Kapatılıyor..." : "Bildirimleri kapat"}
                </Button>
              )}
              <span className="self-center text-sm text-muted-foreground">
                Durum: {pushOn ? "Açık" : pushState === "denied" ? "İzin kapalı" : "Kapalı"}
              </span>
            </div>
          )}
          {pushMessage ? <p className="text-sm text-muted-foreground">{pushMessage}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
