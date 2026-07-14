import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, type SupportTicketStatus } from "@magaza/shared";

export const GET = withAuth(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take } = parsePagination(searchParams);
    const storeId = searchParams.get("storeId");
    const status = searchParams.get("status") as SupportTicketStatus | null;

    const where: { storeId?: string; status?: SupportTicketStatus } = {};
    if (storeId) where.storeId = storeId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: { store: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(items, total, page, limit));
  },
  { adminOnly: true }
);
