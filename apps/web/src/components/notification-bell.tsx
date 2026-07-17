"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaginatedResponse } from "@magaza/shared";
import {
  canUseWebPush,
  isIosDevice,
  isStandaloneMode,
  syncWebPushSubscription,
  type WebPushState,
} from "@/lib/web-push-client";

type Notification = {
  id: string;
  title: string;
  body: string;
  linkUrl?: string | null;
  readAt?: string | null;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [pushState, setPushState] = useState<WebPushState>("idle");
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState("");

  const pushAvailable =
    canUseWebPush() && (!isIosDevice() || isStandaloneMode());

  async function loadCount() {
    if (document.hidden) return;
    const res = await fetch("/api/v1/notifications/unread-count");
    const data = await res.json();
    setUnread(data.count ?? 0);
  }

  async function loadItems() {
    const res = await fetch("/api/v1/notifications?limit=8");
    const data: PaginatedResponse<Notification> = await res.json();
    setItems(data.items);
  }

  useEffect(() => {
    loadCount();
    const onVisible = () => {
      if (!document.hidden) loadCount();
    };
    document.addEventListener("visibilitychange", onVisible);
    const t = setInterval(loadCount, 120_000);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!pushAvailable) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "granted") {
      void syncWebPushSubscription(false).then((result) => setPushState(result.state));
    } else if (Notification.permission === "denied") {
      setPushState("denied");
    } else {
      setPushState("idle");
    }
  }, [pushAvailable]);

  useEffect(() => {
    if (open) loadItems();
  }, [open]);

  async function markAllRead() {
    await fetch("/api/v1/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    setUnread(0);
    loadItems();
  }

  async function enablePush() {
    setPushLoading(true);
    setPushMessage("");
    try {
      const result = await syncWebPushSubscription(true);
      setPushState(result.state);
      setPushMessage(result.message ?? "");
    } finally {
      setPushLoading(false);
    }
  }

  const showPushBanner = pushAvailable && pushState !== "enabled" && pushState !== "unsupported";

  return (
    <div className="relative flex items-center gap-2">
      {showPushBanner && (
        <Button
          variant="outline"
          size="sm"
          className="hidden h-8 gap-1.5 text-xs sm:inline-flex"
          onClick={enablePush}
          disabled={pushLoading}
        >
          <BellOff className="h-3.5 w-3.5" />
          {pushLoading ? "Açılıyor..." : "Bildirimleri aç"}
        </Button>
      )}
      <Button variant="outline" size="icon" className="relative h-9 w-9" onClick={() => setOpen(!open)}>
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border bg-card p-2 shadow-lg">
            {showPushBanner && (
              <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs text-amber-900">
                    <div className="font-medium">Masaüstü bildirimleri kapalı</div>
                    <div className="mt-0.5 text-amber-800/90">
                      Yeni duyurular için tarayıcı izni gerekir.
                    </div>
                    {pushMessage && <div className="mt-1 text-amber-800/80">{pushMessage}</div>}
                  </div>
                  <Button
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs"
                    onClick={enablePush}
                    disabled={pushLoading}
                  >
                    Aç
                  </Button>
                </div>
              </div>
            )}
            <div className="mb-2 flex items-center justify-between px-2 pt-1">
              <span className="text-sm font-semibold">Bildirimler</span>
              {unread > 0 && (
                <button type="button" className="text-xs text-primary hover:underline" onClick={markAllRead}>
                  Tümünü oku
                </button>
              )}
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {items.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Bildirim yok</p>
              )}
              {items.map((n) => (
                <Link
                  key={n.id}
                  href={n.linkUrl ?? "#"}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-3 py-2.5 text-sm transition hover:bg-muted ${!n.readAt ? "bg-accent/50" : ""}`}
                >
                  <div className="font-medium leading-snug">{n.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
