"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { ensureServiceWorkerRegistration } from "@/lib/web-push-client";

/**
 * Registers the service worker and cleans push subscriptions on logout.
 * Install + notification UI lives in Uygulama Ayarları.
 */
export function PwaSetup() {
  const { status } = useSession();

  useEffect(() => {
    void ensureServiceWorkerRegistration().catch(() => {});
  }, []);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    navigator.serviceWorker?.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!subscription) return;
        return fetch("/api/v1/web-push/subscriptions", {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      })
      .catch(() => {});
  }, [status]);

  return null;
}
