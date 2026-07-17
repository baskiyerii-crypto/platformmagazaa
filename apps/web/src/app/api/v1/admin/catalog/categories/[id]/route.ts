import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { updateCatalogCategorySchema } from "@magaza/shared";

export const PATCH = withAuthParams<{ id: string }>(
  async (request, _auth, context) => {
    const { id } = await context.params;
    const existing = await prisma.catalogCategory.findUnique({ where: { id } });
    if (!existing) return jsonError("Kategori bulunamadı", 404);

    const body = await request.json();
    const parsed = updateCatalogCategorySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    if (parsed.data.campaignId) {
      const campaign = await prisma.catalogCampaign.findUnique({
        where: { id: parsed.data.campaignId },
      });
      if (!campaign) return jsonError("Kampanya bulunamadı", 404);
    }

    const category = await prisma.catalogCategory.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(category);
  },
  { strictAdminOnly: true }
);

export const DELETE = withAuthParams<{ id: string }>(
  async (_request, _auth, context) => {
    const { id } = await context.params;
    const existing = await prisma.catalogCategory.findUnique({ where: { id } });
    if (!existing) return jsonError("Kategori bulunamadı", 404);

    await prisma.catalogCategory.update({
      where: { id },
      data: { active: false },
    });
    return NextResponse.json({ success: true });
  },
  { strictAdminOnly: true }
);
