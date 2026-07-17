import type { MetadataRoute } from "next";
import { getBrandingLogoStatus } from "@/lib/branding";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let version = "default";
  try {
    const status = await getBrandingLogoStatus();
    if (status.updatedAt) {
      version = String(new Date(status.updatedAt).getTime());
    }
  } catch {
    /* keep default */
  }

  const v = `?v=${encodeURIComponent(version)}`;

  return {
    id: "/",
    name: "Reklam Platform",
    short_name: "Reklam",
    description: "AVM ve açık hava alan envanteri yönetim sistemi",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0f172a",
    theme_color: "#2563eb",
    lang: "tr",
    dir: "ltr",
    icons: [
      {
        src: `/api/v1/branding/icon/48${v}`,
        sizes: "48x48",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/api/v1/branding/icon/96${v}`,
        sizes: "96x96",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/api/v1/branding/icon/192${v}`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/api/v1/branding/icon/512${v}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/api/v1/branding/icon/512${v}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    display_override: ["standalone", "browser"],
    prefer_related_applications: false,
  };
}
