import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { outdoorEntrySchema, formNumberOptional, parseNumber } from "@magaza/shared";
import { saveUploadedFile } from "@/lib/upload";
import { cleanupMediaUrls, replaceMediaUrl } from "@/lib/media-cleanup";

export const PATCH = withAuthParams<{ id: string }>(async (request, auth, context) => {
  const { id } = await context.params;
  const entry = await prisma.outdoorEntry.findUnique({ where: { id } });
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
        category: "OUTDOOR",
        storeId: entry.storeId,
        createdById: auth.userId,
        sourceRef: `outdoor:${id}`,
      });
      await replaceMediaUrl(entry.gorselUrl, url);
      updateData.gorselUrl = url;
    }

    if (!Object.keys(updateData).length) {
      return jsonError("Güncellenecek alan yok", 400);
    }

    const parsed = outdoorEntrySchema.partial().safeParse(updateData);
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
    const parsed = outdoorEntrySchema.partial().safeParse(normalized);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }
    updateData = parsed.data;
    if (parsed.data.gorselUrl && parsed.data.gorselUrl !== entry.gorselUrl) {
      await replaceMediaUrl(entry.gorselUrl, parsed.data.gorselUrl);
    }
  }

  const updated = await prisma.outdoorEntry.update({
    where: { id },
    data: updateData,
    include: { subType: true },
  });

  return NextResponse.json(updated);
});

export const DELETE = withAuthParams<{ id: string }>(async (_request, auth, context) => {
  const { id } = await context.params;
  const entry = await prisma.outdoorEntry.findUnique({ where: { id } });
  if (!entry) return jsonError("Kayıt bulunamadı", 404);
  if (auth.role === "STORE" && entry.storeId !== auth.storeId) {
    return jsonError("Yetkisiz erişim", 403);
  }

  await cleanupMediaUrls([entry.gorselUrl]);
  await prisma.outdoorEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
