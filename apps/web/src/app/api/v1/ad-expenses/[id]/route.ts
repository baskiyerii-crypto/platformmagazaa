import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { updateAdExpenseSchema, isStaffRole } from "@magaza/shared";
import { expenseInclude, serializeExpense } from "@/lib/ad-expenses";

export const PATCH = withAuthParams<{ id: string }>(
  async (request, auth, context) => {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateAdExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    const existing = await prisma.adExpense.findUnique({ where: { id } });
    if (!existing || !existing.active) return jsonError("Gider bulunamadı", 404);

    const staff = isStaffRole(auth.role);
    if (!staff && existing.storeId !== auth.storeId) {
      return jsonError("Yetkisiz", 403);
    }

    if (parsed.data.announcementId) {
      const announcement = await prisma.announcement.findFirst({
        where: {
          id: parsed.data.announcementId,
          active: true,
          kind: "KAMPANYA",
        },
      });
      if (!announcement) return jsonError("Kampanya duyurusu bulunamadı", 400);
    }

    if (parsed.data.categoryId) {
      const cat = await prisma.adExpenseCategory.findFirst({
        where: { id: parsed.data.categoryId, active: true },
      });
      if (!cat) return jsonError("Geçersiz kategori", 400);
    }

    const updated = await prisma.adExpense.update({
      where: { id },
      data: {
        ...(parsed.data.categoryId !== undefined ? { categoryId: parsed.data.categoryId } : {}),
        ...(parsed.data.announcementId !== undefined
          ? { announcementId: parsed.data.announcementId || null }
          : {}),
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.quantity !== undefined ? { quantity: parsed.data.quantity } : {}),
        ...(parsed.data.totalPrice !== undefined ? { totalPrice: parsed.data.totalPrice } : {}),
        ...(parsed.data.expenseDate !== undefined
          ? { expenseDate: new Date(parsed.data.expenseDate) }
          : {}),
        ...(parsed.data.note !== undefined ? { note: parsed.data.note || null } : {}),
      },
      include: expenseInclude,
    });

    return NextResponse.json(serializeExpense(updated));
  }
);

export const DELETE = withAuthParams<{ id: string }>(
  async (_request, auth, context) => {
    const { id } = await context.params;
    const existing = await prisma.adExpense.findUnique({ where: { id } });
    if (!existing || !existing.active) return jsonError("Gider bulunamadı", 404);

    const staff = isStaffRole(auth.role);
    if (!staff && existing.storeId !== auth.storeId) {
      return jsonError("Yetkisiz", 403);
    }

    await prisma.adExpense.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ success: true });
  }
);
