"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { PwaSetup } from "@/components/pwa-setup";
import { PwaInstallProvider } from "@/components/pwa-install-context";
import { BrandFavicon } from "@/components/brand-favicon";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <QueryClientProvider client={queryClient}>
        <PwaInstallProvider>
          {children}
          <BrandFavicon />
          <PwaSetup />
        </PwaInstallProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
