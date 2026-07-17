import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { storeSignageEntrySchema } from "@magaza/shared";
import { saveUploadedFile } from "@/lib/upload";
import { cleanupMediaUrls, replaceMediaUrl } from "@/lib/media-cleanup";
import {
  validatePlacement,
  validateReyonCategory,
  validateSignageSubType,
} from "@/lib/signage-validation";

export const PATCH = withAuthParams<{ id: string }>(async (request, auth, context) => {
  const { id } = await context.params;
  const entry = await prisma.storeSignageEntry.findUnique({ where: { id } });
  if (!entry) return jsonError("Kayıt bulunamadı", 404);
  if (auth.role === "STORE" && entry.storeId !== auth.storeId) {
    return jsonError("Yetkisiz erişim", 403);
  }

  const contentType = request.headers.get("content-type") ?? "";
  let updateData: Record<string, unknown> = {};

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    updateData = {
      subTypeId: formData.get("subTypeId") || entry.subTypeId,
      placementId: formData.get("placementId") || entry.placementId,
      reyonCategoryId:
        formData.get("reyonCategoryId")?.toString() || entry.reyonCategoryId,
      en: Number(formData.get("en") ?? entry.en),
      boy: Number(formData.get("boy") ?? entry.boy),
      adet: Number(formData.get("adet") ?? entry.adet),
      note: formData.get("note") ?? entry.note,
    };
    const file = formData.get("file") as File | null;
    if (file && file.size > 0) {
      const url = await saveUploadedFile(file, {
        category: "STORE_SIGNAGE",
        storeId: entry.storeId,
        createdById: auth.userId,
        sourceRef: `signage:${id}`,
      });
      await replaceMediaUrl(entry.gorselUrl, url);
      updateData.gorselUrl = url;
    }
  } else {
    const body = await request.json();
    const parsed = storeSignageEntrySchema.partial().safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }
    updateData = parsed.data;
    if (parsed.data.gorselUrl && parsed.data.gorselUrl !== entry.gorselUrl) {
      await replaceMediaUrl(entry.gorselUrl, parsed.data.gorselUrl);
    }
  }

  if (updateData.subTypeId) {
    const subType = await validateSignageSubType(String(updateData.subTypeId));
    if (!subType) return jsonError("Geçersiz envanter türü", 400);
  }
  if (updateData.placementId) {
    const placement = await validatePlacement(String(updateData.placementId));
    if (!placement) return jsonError("Geçersiz konum", 400);
  }
  if (updateData.reyonCategoryId) {
    const reyon = await validateReyonCategory(String(updateData.reyonCategoryId));
    if (!reyon) return jsonError("Geçersiz reyon kategorisi", 400);
  }

  const updated = await prisma.storeSignageEntry.update({
    where: { id },
    data: updateData,
    include: { subType: true, placement: true, reyonCategory: true },
  });

  return NextResponse.json(updated);
});

export const DELETE = withAuthParams<{ id: string }>(async (_request, auth, context) => {
  const { id } = await context.params;
  const entry = await prisma.storeSignageEntry.findUnique({ where: { id } });
  if (!entry) return jsonError("Kayıt bulunamadı", 404);
  if (auth.role === "STORE" && entry.storeId !== auth.storeId) {
    return jsonError("Yetkisiz erişim", 403);
  }

  await cleanupMediaUrls([entry.gorselUrl]);
  await prisma.storeSignageEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
