import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import { createAdExpenseCategorySchema } from "@magaza/shared";

export const GET = withAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("includeInactive") === "1";
  const items = await prisma.adExpenseCategory.findMany({
    where: includeInactive ? undefined : { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(items);
});

export const POST = withAuth(
  async (request) => {
    const body = await request.json();
    const parsed = createAdExpenseCategorySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }
    const item = await prisma.adExpenseCategory.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code || null,
        sortOrder: parsed.data.sortOrder ?? 0,
        active: parsed.data.active ?? true,
      },
    });
    return NextResponse.json(item, { status: 201 });
  },
  { adminOnly: true }
);
