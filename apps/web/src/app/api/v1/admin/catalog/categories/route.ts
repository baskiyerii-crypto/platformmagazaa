import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import { createCatalogCategorySchema } from "@magaza/shared";

export const GET = withAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  const categories = await prisma.catalogCategory.findMany({
    where: {
      active: true,
      ...(campaignId ? { campaignId } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(categories);
});

export const POST = withAuth(
  async (request) => {
    const body = await request.json();
    const parsed = createCatalogCategorySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    const campaign = await prisma.catalogCampaign.findUnique({
      where: { id: parsed.data.campaignId },
    });
    if (!campaign) return jsonError("Kampanya bulunamadı", 404);

    const category = await prisma.catalogCategory.create({
      data: {
        campaignId: parsed.data.campaignId,
        name: parsed.data.name,
        sortOrder: parsed.data.sortOrder ?? 0,
        active: parsed.data.active ?? true,
      },
    });
    return NextResponse.json(category, { status: 201 });
  },
  { strictAdminOnly: true }
);
