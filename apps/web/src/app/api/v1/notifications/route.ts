import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import { parsePagination, paginatedResponse } from "@magaza/shared";

export const GET = withAuth(async (request, auth) => {
  const { searchParams } = new URL(request.url);
  const { page, limit, skip, take } = parsePagination(searchParams);
  const unreadOnly = searchParams.get("unread") === "true";

  const where = {
    userId: auth.userId,
    ...(unreadOnly ? { readAt: null } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.notification.count({ where }),
  ]);

  return NextResponse.json(paginatedResponse(items, total, page, limit));
});

export const PATCH = withAuth(async (request, auth) => {
  const body = await request.json();
  const ids = body.ids as string[] | undefined;
  const markAll = body.markAll === true;

  if (markAll) {
    await prisma.notification.updateMany({
      where: { userId: auth.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ success: true });
  }

  if (!ids?.length) return jsonError("ids veya markAll gerekli", 400);

  await prisma.notification.updateMany({
    where: { userId: auth.userId, id: { in: ids } },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ success: true });
});
