import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth } from "@/lib/api-auth";
import { parsePagination, paginatedResponse } from "@magaza/shared";

export const GET = withAuth(async (request, auth) => {
  const { searchParams } = new URL(request.url);
  const { page, limit, skip, take } = parsePagination(searchParams);
  const now = new Date();
  const storeId = auth.role === "STORE" ? auth.storeId : searchParams.get("storeId");

  const where = {
    active: true,
    publishedAt: { lte: now },
    AND: [
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ...(auth.role === "STORE" && storeId
        ? [
            {
              OR: [
                { audience: "ALL_STORES" as const },
                { audience: "SELECTED_STORES" as const, storeIds: { has: storeId } },
              ],
            },
          ]
        : auth.role === "STORE"
          ? [{ audience: "ALL_STORES" as const }]
          : []),
    ],
  };

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      select: {
        id: true,
        title: true,
        body: true,
        audience: true,
        storeIds: true,
        attachments: true,
        publishedAt: true,
        expiresAt: true,
        createdBy: { select: { username: true } },
        receipts: storeId
          ? {
              where: { storeId },
              select: {
                id: true,
                status: true,
                readAt: true,
                processingAt: true,
                completedAt: true,
                completionImages: true,
                note: true,
              },
              take: 1,
            }
          : false,
      },
      orderBy: { publishedAt: "desc" },
      skip,
      take,
    }),
    prisma.announcement.count({ where }),
  ]);

  const mapped = items.map((item) => {
    const receipt = Array.isArray(item.receipts) ? item.receipts[0] ?? null : null;
    const { receipts: _, ...rest } = item as typeof item & { receipts?: unknown };
    return { ...rest, receipt };
  });

  return NextResponse.json(paginatedResponse(mapped, total, page, limit), {
    headers: { "Cache-Control": "private, max-age=30" },
  });
});
