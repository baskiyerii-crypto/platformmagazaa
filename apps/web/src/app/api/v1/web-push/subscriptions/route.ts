import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@magaza/database";
import { withAuth } from "@/lib/api-auth";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  expirationTime: z.number().nullable().optional(),
});

export const POST = withAuth(async (request, auth) => {
  const body = await request.json();
  const parsed = subscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz abonelik verisi" }, { status: 400 });
  }

  const { endpoint, keys, expirationTime } = parsed.data;
  const userAgent = request.headers.get("user-agent");

  await prisma.webPushSubscription.upsert({
    where: { endpoint },
    update: {
      userId: auth.userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
      expirationTime: expirationTime ? new Date(expirationTime) : null,
      userAgent,
    },
    create: {
      userId: auth.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      expirationTime: expirationTime ? new Date(expirationTime) : null,
      userAgent,
    },
  });

  return NextResponse.json({ success: true });
});

export const DELETE = withAuth(async (request, auth) => {
  const body = await request.json().catch(() => ({}));
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : null;

  if (endpoint) {
    await prisma.webPushSubscription.deleteMany({
      where: { endpoint, userId: auth.userId },
    });
  } else {
    await prisma.webPushSubscription.deleteMany({
      where: { userId: auth.userId },
    });
  }

  return NextResponse.json({ success: true });
});
