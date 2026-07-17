"use client";

import { useCallback, useEffect } from "react";
import { BRANDING_UPDATED_EVENT, type BrandingUpdatedDetail } from "@/lib/branding-events";

function updateFaviconLinks(version: string | null) {
  const suffix = version ? `?v=${encodeURIComponent(version)}` : "";
  const iconHref = `/api/v1/branding/icon/192${suffix}`;
  const appleHref = `/api/v1/branding/icon/apple-touch-icon${suffix}`;

  const selectors = ['link[rel="icon"]', 'link[rel="shortcut icon"]', 'link[rel="apple-touch-icon"]'];
  for (const selector of selectors) {
    const links = document.querySelectorAll<HTMLLinkElement>(selector);
    links.forEach((link) => {
      const href = link.rel === "apple-touch-icon" ? appleHref : iconHref;
      if (link.getAttribute("href") !== href) {
        link.setAttribute("href", href);
      }
    });
  }
}

async function fetchAndApplyFavicon() {
  try {
    const res = await fetch("/api/v1/branding/logo", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as BrandingUpdatedDetail;
    updateFaviconLinks(data.updatedAt);
  } catch {
    // ignore
  }
}

export function BrandFavicon() {
  const applyDetail = useCallback((detail: BrandingUpdatedDetail) => {
    updateFaviconLinks(detail.updatedAt);
  }, []);

  useEffect(() => {
    void fetchAndApplyFavicon();

    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<BrandingUpdatedDetail>).detail;
      if (detail) applyDetail(detail);
      else void fetchAndApplyFavicon();
    };

    window.addEventListener(BRANDING_UPDATED_EVENT, onUpdated);
    const interval = window.setInterval(() => {
      void fetchAndApplyFavicon();
    }, 120_000);

    return () => {
      window.removeEventListener(BRANDING_UPDATED_EVENT, onUpdated);
      window.clearInterval(interval);
    };
  }, [applyDetail]);

  return null;
}
