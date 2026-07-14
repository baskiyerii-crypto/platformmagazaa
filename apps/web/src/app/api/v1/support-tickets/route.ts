import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import { createSupportTicketSchema, parsePagination, paginatedResponse, type SupportTicketStatus } from "@magaza/shared";
import { notifyStaff } from "@/lib/notify";

export const GET = withAuth(async (request, auth) => {
  const { searchParams } = new URL(request.url);
  const { page, limit, skip, take } = parsePagination(searchParams);

  const where: { storeId?: string; status?: SupportTicketStatus } = {};
  if (auth.role === "STORE") {
    if (!auth.storeId) return jsonError("Mağaza bulunamadı", 404);
    where.storeId = auth.storeId;
  }

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
});

export const POST = withAuth(async (request, auth) => {
  if (auth.role !== "STORE" || !auth.storeId) {
    return jsonError("Sadece mağaza kullanıcıları destek talebi açabilir", 403);
  }

  const body = await request.json();
  const parsed = createSupportTicketSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      storeId: auth.storeId,
      subject: parsed.data.subject,
      message: parsed.data.message,
    },
    include: { store: { select: { name: true } } },
  });

  await notifyStaff({
    type: "SUPPORT",
    title: "Yeni Destek Talebi",
    body: `${ticket.store.name}: ${parsed.data.subject}`,
    linkUrl: "/admin/support",
  });

  return NextResponse.json(ticket, { status: 201 });
});
