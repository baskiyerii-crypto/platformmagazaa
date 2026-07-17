import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import { createCatalogItemSchema } from "@magaza/shared";
import { saveUploadedFile } from "@/lib/upload";
import { catalogItemInclude } from "@/lib/catalog-campaign";

export const GET = withAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  const categoryId = searchParams.get("categoryId");
  const scope = searchParams.get("scope") ?? "product";
  const all = searchParams.get("all") === "1";

  const items = await prisma.catalogItem.findMany({
    where: {
      ...(all ? {} : { active: true }),
      ...(campaignId
        ? { campaignId }
        : scope === "campaign"
          ? { campaignId: { not: null } }
          : { campaignId: null }),
      ...(categoryId ? { categoryId } : {}),
    },
    include: catalogItemInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(items);
});

export const POST = withAuth(
  async (request, auth) => {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") === "campaign" ? "campaign" : "product";
    const contentType = request.headers.get("content-type") ?? "";
    let data: Record<string, unknown> = {};
    let referenceImageUrl: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      data = {
        name: formData.get("name")?.toString(),
        code: formData.get("code")?.toString(),
        type: formData.get("type")?.toString() || "FIXED",
        campaignId: formData.get("campaignId")?.toString() || null,
        categoryId: formData.get("categoryId")?.toString() || null,
        description: formData.get("description")?.toString() || null,
        sortOrder: formData.get("sortOrder")
          ? Number(formData.get("sortOrder"))
          : 0,
        active: formData.get("active") !== "false",
      };
      const file = formData.get("file");
      if (file instanceof File && file.size > 0) {
        referenceImageUrl = await saveUploadedFile(file, {
          category: "CATALOG",
          createdById: auth.userId,
        });
      }
    } else {
      const body = await request.json();
      data = body;
      referenceImageUrl = body.referenceImageUrl ?? null;
    }

    // Product catalog and campaign catalog are strictly separate.
    if (scope === "product") {
      data.campaignId = null;
      data.categoryId = null;
    }

    const parsed = createCatalogItemSchema.safeParse({
      ...data,
      referenceImageUrl,
    });
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    if (scope === "campaign") {
      if (!parsed.data.campaignId || !parsed.data.categoryId) {
        return jsonError("Kampanya ürünü için kampanya ve kategori zorunlu", 400);
      }
      const [campaign, category] = await Promise.all([
        prisma.catalogCampaign.findUnique({ where: { id: parsed.data.campaignId } }),
        prisma.catalogCategory.findUnique({ where: { id: parsed.data.categoryId } }),
      ]);
      if (!campaign || !campaign.active) return jsonError("Kampanya bulunamadı", 404);
      if (!category || !category.active) return jsonError("Kategori bulunamadı", 404);
      if (category.campaignId !== campaign.id) {
        return jsonError("Kategori bu kampanyaya ait değil", 400);
      }
    }

    const existing = await prisma.catalogItem.findUnique({
      where: { code: parsed.data.code },
    });
    if (existing) return jsonError("Bu kod zaten kullanımda", 400);

    const item = await prisma.catalogItem.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        type: parsed.data.type,
        description: parsed.data.description ?? null,
        referenceImageUrl: parsed.data.referenceImageUrl ?? null,
        active: parsed.data.active ?? true,
        sortOrder: parsed.data.sortOrder ?? 0,
        campaignId: scope === "product" ? null : parsed.data.campaignId!,
        categoryId: scope === "product" ? null : parsed.data.categoryId!,
      },
      include: catalogItemInclude,
    });
    return NextResponse.json(item, { status: 201 });
  },
  { strictAdminOnly: true }
);
