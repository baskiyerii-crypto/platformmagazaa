"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BRANDING_UPDATED_EVENT, type BrandingUpdatedDetail } from "@/lib/branding-events";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  size?: number;
};

export function BrandLogo({
  className = "h-14 w-14",
  imageClassName = "object-cover",
  fallbackClassName = "bg-primary text-primary-foreground text-2xl font-bold",
  size = 56,
}: BrandLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/branding/logo", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as BrandingUpdatedDetail & { fileExists?: boolean };
        if (data.logoUrl && data.fileExists !== false) {
          setLogoUrl(data.logoUrl);
          setVersion(data.updatedAt);
        } else {
          setLogoUrl(null);
          setVersion(data.updatedAt);
        }
      } catch {
        // keep fallback
      }
    }

    void load();

    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<BrandingUpdatedDetail>).detail;
      if (!detail) {
        void load();
        return;
      }
      setLogoUrl(detail.logoUrl);
      setVersion(detail.updatedAt);
    };

    window.addEventListener(BRANDING_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(BRANDING_UPDATED_EVENT, onUpdated);
  }, []);

  if (logoUrl) {
    const src = `${logoUrl}${version ? `?v=${encodeURIComponent(version)}` : ""}`;
    return (
      <div className={`relative overflow-hidden rounded-2xl ${className}`}>
        <Image
          src={src}
          alt="Mağaza Platform logosu"
          fill
          className={imageClassName}
          unoptimized
          sizes={`${size}px`}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-2xl ${fallbackClassName} ${className}`}
      aria-hidden
    >
      M
    </div>
  );
}
