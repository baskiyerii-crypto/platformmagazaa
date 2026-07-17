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

type PwaInstallContextValue = {
  installEvent: BeforeInstallPromptEvent | null;
  standalone: boolean;
  ios: boolean;
  canPromptInstall: boolean;
  installApp: () => Promise<"accepted" | "dismissed" | "unavailable">;
  installHint: string;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

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
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!installEvent) return "unavailable" as const;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstallEvent(null);
    }
    return choice.outcome;
  }, [installEvent]);

  const installHint = useMemo(() => {
    if (ios) {
      return "Safari’de Paylaş → Ana Ekrana Ekle";
    }
    if (installEvent) {
      return "Tek tıkla masaüstüne / ana ekrana ekleyin";
    }
    return "Chrome/Edge: adres çubuğundaki yükle ikonu veya menü → Uygulamayı yükle / Ana ekrana ekle";
  }, [ios, installEvent]);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      installEvent,
      standalone,
      ios,
      canPromptInstall: Boolean(installEvent) && !standalone,
      installApp,
      installHint,
    }),
    [installEvent, standalone, ios, installApp, installHint]
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
