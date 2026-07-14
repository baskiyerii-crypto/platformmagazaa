import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { updateSupportTicketSchema } from "@magaza/shared";
import { notifyStoreUsers } from "@/lib/notify";

export const PATCH = withAuthParams<{ id: string }>(
  async (request, _auth, context) => {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateSupportTicketSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    const existing = await prisma.supportTicket.findUnique({ where: { id } });
    if (!existing) return jsonError("Talep bulunamadı", 404);

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: parsed.data,
      include: { store: { select: { name: true } } },
    });

    if (parsed.data.status && parsed.data.status !== existing.status) {
      await notifyStoreUsers(existing.storeId, {
        type: "SUPPORT",
        title: "Destek Talebi Güncellendi",
        body: `${ticket.subject} — ${parsed.data.status}`,
        linkUrl: "/store/support",
      });
    }

    return NextResponse.json(ticket);
  },
  { adminOnly: true }
);
