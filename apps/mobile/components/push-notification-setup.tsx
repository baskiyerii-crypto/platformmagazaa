import { useEffect } from "react";
import { AppState } from "react-native";
import { useRouter } from "expo-router";
import { getUser } from "@/lib/auth";
import { registerForPushNotifications } from "@/lib/notifications";
import { useNotifications } from "@/components/notification-provider";

export function PushNotificationSetup() {
  const router = useRouter();
  const { refresh } = useNotifications();

  useEffect(() => {
    let receivedSub: { remove: () => void } | undefined;
    let responseSub: { remove: () => void } | undefined;
    let tokenSub: { remove: () => void } | undefined;

    async function setup() {
      const user = await getUser();
      if (!user) return;

      await registerForPushNotifications();

      const Notifications = await import("expo-notifications");

      receivedSub = Notifications.addNotificationReceivedListener(() => {
        refresh().catch(() => {});
      });

      responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const linkUrl = response.notification.request.content.data?.linkUrl as string | undefined;
        refresh().catch(() => {});
        if (linkUrl) {
          router.push(linkUrl as never);
        } else {
          router.push("/notifications" as never);
        }
      });

      tokenSub = Notifications.addPushTokenListener(async () => {
        await registerForPushNotifications();
      });
    }

    setup();

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        getUser().then((user) => {
          if (user) registerForPushNotifications();
        });
        refresh().catch(() => {});
      }
    });

    return () => {
      receivedSub?.remove();
      responseSub?.remove();
      tokenSub?.remove();
      appStateSub.remove();
    };
  }, [refresh, router]);

  return null;
}
