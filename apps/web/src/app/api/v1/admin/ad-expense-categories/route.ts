import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import { createAdExpenseCategorySchema } from "@magaza/shared";

function dbError(e: unknown) {
  const msg = e instanceof Error ? e.message : "Veritabanı hatası";
  const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
  if (code === "P2021" || /does not exist|Unknown arg|AnnounementKind|AdExpense/i.test(msg)) {
    return jsonError(
      "Veritabanı şeması güncel değil (AdExpense tabloları eksik). Deploy sonrası prisma db push veya konteyneri yeniden başlatın.",
      503
    );
  }
  console.error("[ad-expense-categories]", e);
  return jsonError(msg || "Sunucu hatası", 500);
}

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "1";
    const items = await prisma.adExpenseCategory.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(items);
  } catch (e) {
    return dbError(e);
  }
});

export const POST = withAuth(
  async (request) => {
    try {
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
    } catch (e) {
      return dbError(e);
    }
  },
  { adminOnly: true }
);
