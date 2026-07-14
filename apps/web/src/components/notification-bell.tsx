"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaginatedResponse } from "@magaza/shared";

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

  return (
    <div className="relative">
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
