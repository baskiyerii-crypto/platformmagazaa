import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async (_request, auth) => {
  const unread = await prisma.notification.count({
    where: { userId: auth.userId, readAt: null },
  });
  return NextResponse.json({ count: unread }, {
    headers: { "Cache-Control": "private, max-age=15" },
  });
});
