"use client";

import { useState } from "react";
import { Download, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/components/pwa-install-context";
import { cn } from "@/lib/utils";

export function PwaInstallSidebarButton({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const { standalone, canPromptInstall, installApp, installHint, ios } = usePwaInstall();
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);

  if (standalone) return null;

  async function onClick() {
    setBusy(true);
    setHint("");
    try {
      const outcome = await installApp();
      if (outcome === "unavailable") {
        setHint(installHint);
        return;
      }
      if (outcome === "dismissed") {
        setHint("Kurulum iptal edildi. Tekrar denemek için butona basın.");
      }
    } catch (error) {
      setHint(error instanceof Error ? error.message : "Kurulum başlatılamadı");
    } finally {
      setBusy(false);
    }
  }

  const isDesktop = variant === "desktop";

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={isDesktop ? "ghost" : "outline"}
        className={cn(
          "w-full justify-start",
          isDesktop &&
            "text-[hsl(var(--sidebar-muted))] hover:bg-white/10 hover:text-[hsl(var(--sidebar-foreground))]",
          canPromptInstall && isDesktop && "bg-white/10 text-[hsl(var(--sidebar-foreground))]"
        )}
        onClick={() => void onClick()}
        disabled={busy}
      >
        {ios ? (
          <MonitorSmartphone className="mr-2 h-4 w-4" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {busy ? "Ekleniyor..." : "Ana ekrana ekle"}
      </Button>
      {hint ? (
        <p
          className={cn(
            "rounded-lg px-3 py-2 text-xs leading-relaxed",
            isDesktop
              ? "bg-white/5 text-[hsl(var(--sidebar-muted))]"
              : "bg-muted text-muted-foreground"
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
