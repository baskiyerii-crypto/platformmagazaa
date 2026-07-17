import { Expo, ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "@magaza/database";
import type { NotificationType } from "@magaza/shared";
import { sendWebPushToUsers } from "@/lib/web-push";

const expo = new Expo();

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string | null;
}) {
  return prisma.notification.create({ data: params });
}

export async function notifyUsers(
  userIds: string[],
  params: Omit<Parameters<typeof createNotification>[0], "userId">
) {
  const unique = [...new Set(userIds)];
  if (!unique.length) return;
  await prisma.notification.createMany({
    data: unique.map((userId) => ({ userId, ...params })),
  });
  await Promise.allSettled([
    sendPushToUsers(unique, params.title, params.body, params.linkUrl),
    sendWebPushToUsers(unique, {
      title: params.title,
      body: params.body,
      linkUrl: params.linkUrl,
    }),
  ]);
}

export async function notifyStaff(params: Omit<Parameters<typeof createNotification>[0], "userId">) {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER"] } },
    select: { id: true },
  });
  await notifyUsers(
    staff.map((u) => u.id),
    params
  );
}

export async function notifyStoreUsers(
  storeId: string,
  params: Omit<Parameters<typeof createNotification>[0], "userId">
) {
  const users = await prisma.user.findMany({
    where: { storeId, role: "STORE" },
    select: { id: true },
  });
  await notifyUsers(
    users.map((u) => u.id),
    params
  );
}

async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  linkUrl?: string | null
) {
  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: userIds } },
    select: { token: true },
  });

  const messages: ExpoPushMessage[] = [];
  for (const { token } of tokens) {
    if (!Expo.isExpoPushToken(token)) continue;
    messages.push({
      to: token,
      sound: "default",
      title,
      body,
      data: linkUrl ? { linkUrl } : undefined,
    });
  }

  if (!messages.length) return;

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch {
      // push failures should not block main flow
    }
  }
}
