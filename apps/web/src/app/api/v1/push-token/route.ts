import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";

export const POST = withAuth(async (request, auth) => {
  const body = await request.json();
  const token = body.token as string;
  if (!token) return jsonError("Token gerekli", 400);

  await prisma.pushToken.upsert({
    where: { token },
    update: { userId: auth.userId },
    create: { token, userId: auth.userId },
  });

  return NextResponse.json({ success: true });
});
