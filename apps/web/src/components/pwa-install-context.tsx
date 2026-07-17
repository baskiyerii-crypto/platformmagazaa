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
import { isIosDevice, isStandaloneMode } from "@/lib/web-push-client";

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
  installEvent: BeforeInstallPromptEvent | null;
  standalone: boolean;
  ios: boolean;
  canPromptInstall: boolean;
  installApp: () => Promise<"accepted" | "dismissed" | "unavailable">;
  installHint: string;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function readDeferredPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === "undefined") return null;
  return window.__deferredInstallPrompt ?? null;
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const ios = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    setStandalone(isStandaloneMode());
    const media = window.matchMedia("(display-mode: standalone)");
    const onChange = () => setStandalone(isStandaloneMode());
    media.addEventListener?.("change", onChange);
    window.addEventListener("appinstalled", onChange);
    return () => {
      media.removeEventListener?.("change", onChange);
      window.removeEventListener("appinstalled", onChange);
    };
  }, []);

  useEffect(() => {
    // Capture may have fired before React hydrated (inline script in layout).
    const existing = readDeferredPrompt();
    if (existing) setInstallEvent(existing);

    const handler = (event: Event) => {
      event.preventDefault();
      const bip = event as BeforeInstallPromptEvent;
      window.__deferredInstallPrompt = bip;
      setInstallEvent(bip);
    };
    const onAvailable = () => {
      const bip = readDeferredPrompt();
      if (bip) setInstallEvent(bip);
    };
    const onInstalled = () => {
      window.__deferredInstallPrompt = null;
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("pwa-install-available", onAvailable);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("pwa-install-available", onAvailable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    const event = installEvent ?? readDeferredPrompt();
    if (!event) return "unavailable" as const;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") {
      window.__deferredInstallPrompt = null;
      setInstallEvent(null);
    }
    return choice.outcome;
  }, [installEvent]);

  const installHint = useMemo(() => {
    if (ios) {
      return "Safari’de Paylaş → Ana Ekrana Ekle";
    }
    if (installEvent || readDeferredPrompt()) {
      return "Tek tıkla masaüstüne / ana ekrana ekleyin";
    }
    return "Kurulum hazır değilse sayfayı yenileyin. Chrome/Edge menü → Uygulamayı yükle.";
  }, [ios, installEvent]);

  const canPromptInstall = Boolean((installEvent || (typeof window !== "undefined" && window.__deferredInstallPrompt)) && !standalone);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      installEvent,
      standalone,
      ios,
      canPromptInstall,
      installApp,
      installHint,
    }),
    [installEvent, standalone, ios, canPromptInstall, installApp, installHint]
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
