import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Mağaza Platform",
    short_name: "Mağaza",
    description: "AVM ve açık hava alan envanteri yönetim sistemi",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#2563eb",
    lang: "tr",
    dir: "ltr",
    icons: [
      {
        src: "/api/v1/branding/icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/v1/branding/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/v1/branding/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    display_override: ["standalone", "browser"],
    prefer_related_applications: false,
  };
}
