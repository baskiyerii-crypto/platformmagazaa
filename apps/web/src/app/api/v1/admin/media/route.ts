import { NextResponse } from "next/server";
import { prisma, type MediaCategory } from "@magaza/database";
import { withAuth } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, MEDIA_CATEGORIES } from "@magaza/shared";

export const GET = withAuth(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take } = parsePagination(searchParams, 24);
    const category = searchParams.get("category");
    const storeId = searchParams.get("storeId");

    const where = {
      ...(category && (MEDIA_CATEGORIES as readonly string[]).includes(category)
        ? { category: category as MediaCategory }
        : {}),
      ...(storeId ? { storeId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.mediaAsset.findMany({
        where,
        include: {
          store: { select: { id: true, name: true } },
          createdBy: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.mediaAsset.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(items, total, page, limit));
  },
  { adminOnly: true }
);
