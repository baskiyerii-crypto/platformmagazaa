import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { storeSignageEntrySchema, formNumberOptional, parseNumber } from "@magaza/shared";
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
    const subTypeId = formData.get("subTypeId");
    if (subTypeId) updateData.subTypeId = String(subTypeId);
    const placementId = formData.get("placementId");
    if (placementId) updateData.placementId = String(placementId);
    if (formData.has("reyonCategoryId")) {
      const r = formData.get("reyonCategoryId")?.toString();
      updateData.reyonCategoryId = r || null;
    }

    const en = formNumberOptional(formData, "en");
    if (en === null) return jsonError("En geçerli bir sayı olmalı", 400);
    if (en !== undefined) {
      if (en <= 0) return jsonError("En pozitif olmalı", 400);
      updateData.en = en;
    }

    const boy = formNumberOptional(formData, "boy");
    if (boy === null) return jsonError("Boy geçerli bir sayı olmalı", 400);
    if (boy !== undefined) {
      if (boy <= 0) return jsonError("Boy pozitif olmalı", 400);
      updateData.boy = boy;
    }

    const adet = formNumberOptional(formData, "adet");
    if (adet === null) return jsonError("Adet geçerli bir sayı olmalı", 400);
    if (adet !== undefined) {
      if (!Number.isInteger(adet) || adet < 1) return jsonError("Adet en az 1 olmalı", 400);
      updateData.adet = adet;
    }

    if (formData.has("note")) {
      const note = formData.get("note");
      updateData.note = note ? String(note) : null;
    }

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

    if (!Object.keys(updateData).length) {
      return jsonError("Güncellenecek alan yok", 400);
    }

    const parsed = storeSignageEntrySchema.partial().safeParse(updateData);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }
    updateData = parsed.data;
  } else {
    const body = await request.json();
    const normalized: Record<string, unknown> = { ...body };
    if ("en" in body) {
      const n = parseNumber(body.en);
      if (n == null) return jsonError("En geçerli bir sayı olmalı", 400);
      normalized.en = n;
    }
    if ("boy" in body) {
      const n = parseNumber(body.boy);
      if (n == null) return jsonError("Boy geçerli bir sayı olmalı", 400);
      normalized.boy = n;
    }
    if ("adet" in body) {
      const n = parseNumber(body.adet);
      if (n == null || !Number.isInteger(n) || n < 1) {
        return jsonError("Adet en az 1 olmalı", 400);
      }
      normalized.adet = n;
    }
    const parsed = storeSignageEntrySchema.partial().safeParse(normalized);
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
