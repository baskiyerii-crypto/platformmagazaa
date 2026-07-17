import { prisma } from "@magaza/database";
import { ensureVapidConfigured, webpush } from "@/lib/vapid";
import { getBrandingIconAbsoluteUrl } from "@/lib/branding";

export type WebPushPayload = {
  title: string;
  body: string;
  linkUrl?: string | null;
};

export async function sendWebPushToUsers(
  userIds: string[],
  payload: WebPushPayload
) {
  if (!ensureVapidConfigured()) return;

  const unique = [...new Set(userIds)];
  if (!unique.length) return;

  const subscriptions = await prisma.webPushSubscription.findMany({
    where: { userId: { in: unique } },
  });

  if (!subscriptions.length) return;

  const icon = getBrandingIconAbsoluteUrl(192);
  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    linkUrl: payload.linkUrl ?? "/",
    icon,
  });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message,
          { TTL: 60 * 60 * 24 }
        );
      } catch (error: unknown) {
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : undefined;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.webPushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );
}
