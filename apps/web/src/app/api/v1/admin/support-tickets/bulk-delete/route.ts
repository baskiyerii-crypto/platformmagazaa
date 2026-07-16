import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import { bulkDeleteIdsSchema } from "@magaza/shared";

export const POST = withAuth(async (request) => {
  const body = await request.json();
  const parsed = bulkDeleteIdsSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
  }

  const result = await prisma.supportTicket.deleteMany({
    where: { id: { in: parsed.data.ids } },
  });

  return NextResponse.json({ deleted: result.count });
}, { strictAdminOnly: true });
