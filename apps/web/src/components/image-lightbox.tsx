"use client";

import { useEffect, useState } from "react";
import { DialogContent, DialogRoot } from "@/components/ui/dialog";
import { fullMediaUrl, normalizeMediaUrl, thumbUrl } from "@magaza/shared";

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
  const resolved = fullMediaUrl(src) ?? normalizeMediaUrl(src) ?? src;
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} className="max-w-5xl">
        <div className="relative mx-auto flex aspect-[4/3] w-full max-h-[75vh] items-center justify-center bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolved}
            alt={title}
            className="max-h-[75vh] max-w-full object-contain"
          />
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
  const thumb = thumbUrl(src);
  const full = fullMediaUrl(src);
  const [current, setCurrent] = useState(thumb ?? full ?? src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrent(thumb ?? full ?? src);
    setFailed(false);
  }, [src, thumb, full]);

  if (failed || !current) {
    return (
      <div
        className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border bg-muted px-1 text-center text-[10px] leading-tight text-muted-foreground"
        title={full ?? src}
      >
        Görsel yok
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border bg-secondary transition hover:ring-2 hover:ring-primary"
      title={alt}
    >
      {/* native img: avoids next/image quirks with /api upload routes */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={current}
        src={current}
        alt={alt}
        className="h-full w-full object-cover"
        onError={() => {
          // Thumb failed → try full file once
          if (full && current !== full) {
            setCurrent(full);
            return;
          }
          setFailed(true);
        }}
      />
    </button>
  );
}
