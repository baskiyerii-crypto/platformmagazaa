"use client";

import Image from "next/image";
import { DialogContent, DialogRoot } from "@/components/ui/dialog";

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
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} className="max-w-5xl">
        <div className="relative mx-auto aspect-[4/3] w-full max-h-[75vh]">
          <Image
            src={src}
            alt={title}
            fill
            className="object-contain"
            unoptimized
            sizes="90vw"
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border bg-secondary transition hover:ring-2 hover:ring-primary"
    >
      <Image src={src} alt={alt} fill className="object-cover" unoptimized />
    </button>
  );
}
