import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import { parsePagination, paginatedResponse } from "@magaza/shared";

export const GET = withAuth(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take } = parsePagination(searchParams);
    const status = searchParams.get("status") ?? "PENDING";

    const where =
      status === "ALL"
        ? {}
        : { status: status as "PENDING" | "APPROVED" | "REJECTED" };

    const [items, total] = await Promise.all([
      prisma.storeSignupRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          storeName: true,
          storeNumber: true,
          username: true,
          status: true,
          adminNote: true,
          createdAt: true,
          reviewedAt: true,
        },
      }),
      prisma.storeSignupRequest.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(items, total, page, limit));
  },
  { adminOnly: true }
);
