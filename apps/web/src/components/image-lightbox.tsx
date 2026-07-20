"use client";

import { useEffect, useState } from "react";
import { DialogContent, DialogRoot } from "@/components/ui/dialog";
import { fullMediaUrl, normalizeMediaUrl, thumbUrl } from "@magaza/shared";

async function loadImageBlobUrl(candidates: string[]): Promise<string | null> {
  for (const url of candidates) {
    if (!url) continue;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct && !ct.startsWith("image/") && !ct.includes("octet-stream")) continue;
      const blob = await res.blob();
      if (!blob.size) continue;
      // Reject JSON error bodies mislabeled as images
      if (blob.type.includes("json") || ct.includes("json")) continue;
      return URL.createObjectURL(blob);
    } catch {
      /* try next */
    }
  }
  return null;
}

export function ImageLightbox({
  open,
  onOpenChange,
  src,
  title = "Görsel",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  title?: string;
}) {
  const full = fullMediaUrl(src) ?? normalizeMediaUrl(src) ?? src;
  const thumb = thumbUrl(full);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setFailed(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    void (async () => {
      const candidates = [full, thumb].filter(
        (u, i, arr): u is string => Boolean(u) && arr.indexOf(u) === i
      );
      const next = await loadImageBlobUrl(candidates);
      if (cancelled) {
        if (next) URL.revokeObjectURL(next);
        return;
      }
      setLoading(false);
      if (next) setBlobUrl(next);
      else setFailed(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, src, full, thumb]);

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} className="w-[min(96vw,72rem)] max-w-5xl">
        <div className="relative mx-auto flex min-h-[240px] w-full max-h-[75vh] items-center justify-center bg-muted/30">
          {loading && (
            <p className="text-sm text-muted-foreground">Görsel yükleniyor…</p>
          )}
          {!loading && blobUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={blobUrl}
              alt={title}
              className="max-h-[75vh] max-w-full object-contain"
            />
          )}
          {!loading && failed && (
            <div className="space-y-2 p-6 text-center text-sm text-muted-foreground">
              <p>Görsel yüklenemedi</p>
              <a
                href={full}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                Dosya URL&apos;sini yeni sekmede aç
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </DialogRoot>
  );
}

export function ClickableThumbnail({
  src,
  alt,
  onClick,
}: {
  src: string;
  alt: string;
  onClick: () => void;
}) {
  const full = fullMediaUrl(src);
  const thumb = thumbUrl(full ?? src);
  const [phase, setPhase] = useState<"thumb" | "full" | "dead">("thumb");

  useEffect(() => {
    setPhase("thumb");
  }, [src]);

  const current =
    phase === "thumb" ? (thumb ?? full) : phase === "full" ? full : null;

  if (!current || phase === "dead") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-xl border bg-muted px-1 text-center text-[10px] leading-tight text-muted-foreground hover:bg-muted/80"
        title={alt}
      >
        Görsel
        <span className="text-primary underline">Büyüt</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border bg-secondary transition hover:ring-2 hover:ring-primary"
      title={alt}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${phase}-${current}`}
        src={current}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => {
          if (phase === "thumb" && full && current !== full) {
            setPhase("full");
            return;
          }
          setPhase("dead");
        }}
      />
    </button>
  );
}
