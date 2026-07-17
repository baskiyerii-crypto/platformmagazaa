import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Reklam Platform",
  description: "AVM ve açık hava alan envanteri yönetim sistemi",
  applicationName: "Reklam Platform",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Reklam Platform",
  },
  icons: {
    icon: [
      { url: "/api/v1/branding/icon/192", sizes: "192x192", type: "image/png" },
      { url: "/api/v1/branding/icon/512", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/api/v1/branding/icon/apple-touch-icon", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
