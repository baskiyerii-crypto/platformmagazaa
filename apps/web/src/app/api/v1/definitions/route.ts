import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import {
  createAreaSubTypeSchema,
  createPlacementOptionSchema,
  createReyonCategorySchema,
} from "@magaza/shared";

export const GET = withAuth(async (_request) => {
  const [categories, placements, reyonCategories] = await Promise.all([
    prisma.areaCategory.findMany({
      include: {
        subTypes: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.placementOption.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.reyonCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return NextResponse.json({ categories, placements, reyonCategories }, {
    headers: { "Cache-Control": "no-store" },
  });
});

export const POST = withAuth(
  async (request) => {
    const body = await request.json();
    const type = body.type as string;

    if (type === "subType") {
      const parsed = createAreaSubTypeSchema.safeParse(body.data);
      if (!parsed.success) {
        return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
      }
      const item = await prisma.areaSubType.create({ data: parsed.data });
      return NextResponse.json(item, { status: 201 });
    }

    if (type === "placement") {
      const parsed = createPlacementOptionSchema.safeParse(body.data);
      if (!parsed.success) {
        return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
      }
      const item = await prisma.placementOption.create({ data: parsed.data });
      return NextResponse.json(item, { status: 201 });
    }

    if (type === "reyonCategory") {
      const parsed = createReyonCategorySchema.safeParse(body.data);
      if (!parsed.success) {
        return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
      }
      try {
        const item = await prisma.reyonCategory.create({ data: parsed.data });
        return NextResponse.json(item, { status: 201 });
      } catch {
        return jsonError("Bu reyon kategori kodu zaten kullanılıyor", 409);
      }
    }

    return jsonError("Geçersiz tanım tipi", 400);
  },
  { adminOnly: true }
);
