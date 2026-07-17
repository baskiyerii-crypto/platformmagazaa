import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { updateCatalogItemSchema } from "@magaza/shared";
import { saveUploadedFile } from "@/lib/upload";
import { catalogItemInclude } from "@/lib/catalog-campaign";

export const GET = withAuthParams<{ id: string }>(
  async (_request, _auth, context) => {
    const { id } = await context.params;
    const item = await prisma.catalogItem.findUnique({
      where: { id },
      include: catalogItemInclude,
    });
    if (!item) return jsonError("Ürün bulunamadı", 404);
    return NextResponse.json(item);
  },
  { adminOnly: true }
);

export const PATCH = withAuthParams<{ id: string }>(
  async (request, auth, context) => {
    const { id } = await context.params;
    const contentType = request.headers.get("content-type") ?? "";
    let data: Record<string, unknown> = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      if (formData.get("name")) data.name = formData.get("name")?.toString();
      if (formData.get("code")) data.code = formData.get("code")?.toString();
      if (formData.get("type")) data.type = formData.get("type")?.toString();
      if (formData.get("campaignId")) data.campaignId = formData.get("campaignId")?.toString();
      if (formData.get("categoryId")) data.categoryId = formData.get("categoryId")?.toString();
      if (formData.has("description"))
        data.description = formData.get("description")?.toString() || null;
      if (formData.has("sortOrder"))
        data.sortOrder = Number(formData.get("sortOrder"));
      if (formData.has("active")) data.active = formData.get("active") !== "false";
      const file = formData.get("file");
      if (file instanceof File && file.size > 0) {
        data.referenceImageUrl = await saveUploadedFile(file, {
          category: "CATALOG",
          createdById: auth.userId,
        });
      }
    } else {
      data = await request.json();
    }

    const parsed = updateCatalogItemSchema.safeParse(data);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    if (parsed.data.campaignId || parsed.data.categoryId) {
      const existing = await prisma.catalogItem.findUnique({ where: { id } });
      if (!existing) return jsonError("Ürün bulunamadı", 404);
      const campaignId = parsed.data.campaignId ?? existing.campaignId;
      const categoryId = parsed.data.categoryId ?? existing.categoryId;
      if (campaignId && categoryId) {
        const category = await prisma.catalogCategory.findUnique({ where: { id: categoryId } });
        if (!category || category.campaignId !== campaignId) {
          return jsonError("Kategori bu kampanyaya ait değil", 400);
        }
      }
    }

    const item = await prisma.catalogItem.update({
      where: { id },
      data: parsed.data,
      include: catalogItemInclude,
    });
    return NextResponse.json(item);
  },
  { strictAdminOnly: true }
);

export const DELETE = withAuthParams<{ id: string }>(
  async (_request, _auth, context) => {
    const { id } = await context.params;
    await prisma.catalogItem.update({
      where: { id },
      data: { active: false },
    });
    return NextResponse.json({ success: true });
  },
  { strictAdminOnly: true }
);
