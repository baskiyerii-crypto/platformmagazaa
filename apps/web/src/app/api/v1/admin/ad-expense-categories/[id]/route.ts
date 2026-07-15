import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { updateAdExpenseCategorySchema } from "@magaza/shared";

export const PATCH = withAuthParams<{ id: string }>(
  async (request, _auth, context) => {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateAdExpenseCategorySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    const existing = await prisma.adExpenseCategory.findUnique({ where: { id } });
    if (!existing) return jsonError("Kategori bulunamadı", 404);

    const item = await prisma.adExpenseCategory.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.code !== undefined ? { code: parsed.data.code || null } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      },
    });
    return NextResponse.json(item);
  },
  { adminOnly: true }
);

export const DELETE = withAuthParams<{ id: string }>(
  async (_request, _auth, context) => {
    const { id } = await context.params;
    const existing = await prisma.adExpenseCategory.findUnique({ where: { id } });
    if (!existing) return jsonError("Kategori bulunamadı", 404);
    await prisma.adExpenseCategory.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ success: true });
  },
  { adminOnly: true }
);
