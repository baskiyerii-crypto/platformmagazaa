"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ensureServiceWorkerRegistration, isIosDevice, isStandaloneMode } from "@/lib/web-push-client";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __deferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

type PwaInstallContextValue = {
  ready: boolean;
  installEvent: BeforeInstallPromptEvent | null;
  standalone: boolean;
  ios: boolean;
  canPromptInstall: boolean;
  installApp: () => Promise<"accepted" | "dismissed" | "unavailable" | "already-installed">;
  installHint: string;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function readDeferredPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === "undefined") return null;
  return window.__deferredInstallPrompt ?? null;
}

function waitForInstallPrompt(ms = 2500): Promise<BeforeInstallPromptEvent | null> {
  const existing = readDeferredPrompt();
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: BeforeInstallPromptEvent | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("pwa-install-available", onAvail);
      clearTimeout(timer);
      resolve(value);
    };
    const onBip = (event: Event) => {
      event.preventDefault();
      const bip = event as BeforeInstallPromptEvent;
      window.__deferredInstallPrompt = bip;
      finish(bip);
    };
    const onAvail = () => finish(readDeferredPrompt());
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("pwa-install-available", onAvail);
    const timer = window.setTimeout(() => finish(readDeferredPrompt()), ms);
  });
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  // Safe SSR defaults — never read window during first render (avoids React #418)
  const [ready, setReady] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setIos(isIosDevice());
    setStandalone(isStandaloneMode());
    setReady(true);

    const capture = (event: Event) => {
      event.preventDefault();
      const bip = event as BeforeInstallPromptEvent;
      window.__deferredInstallPrompt = bip;
      setInstallEvent(bip);
      window.dispatchEvent(new Event("pwa-install-available"));
    };

    // Register SW first — Chrome often needs it before beforeinstallprompt
    void ensureServiceWorkerRegistration()
      .catch(() => null)
      .finally(() => {
        const existing = readDeferredPrompt();
        if (existing) setInstallEvent(existing);
      });

    const onInstalled = () => {
      window.__deferredInstallPrompt = null;
      setInstallEvent(null);
      setStandalone(true);
    };
    const onDisplayChange = () => setStandalone(isStandaloneMode());
    const media = window.matchMedia("(display-mode: standalone)");

    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", onInstalled);
    media.addEventListener?.("change", onDisplayChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", onInstalled);
      media.removeEventListener?.("change", onDisplayChange);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (isStandaloneMode()) return "already-installed" as const;

    await ensureServiceWorkerRegistration().catch(() => null);

    let event = installEvent ?? readDeferredPrompt();
    if (!event) {
      event = await waitForInstallPrompt(3000);
      if (event) setInstallEvent(event);
    }
    if (!event) return "unavailable" as const;

    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") {
      window.__deferredInstallPrompt = null;
      setInstallEvent(null);
    }
    return choice.outcome;
  }, [installEvent]);

  const canPromptInstall = ready && Boolean(installEvent) && !standalone;

  const installHint = useMemo(() => {
    if (!ready) return "";
    if (ios) return "Safari’de Paylaş → Ana Ekrana Ekle";
    if (standalone) return "Uygulama zaten yüklü.";
    if (installEvent) return "Tek tıkla masaüstüne / ana ekrana ekleyin";
    return "Kurulum hazırlanıyor olabilir. Birkaç saniye bekleyip tekrar deneyin.";
  }, [ready, ios, standalone, installEvent]);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      ready,
      installEvent,
      standalone,
      ios,
      canPromptInstall,
      installApp,
      installHint,
    }),
    [ready, installEvent, standalone, ios, canPromptInstall, installApp, installHint]
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall() {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    throw new Error("usePwaInstall must be used within PwaInstallProvider");
  }
  return ctx;
}
