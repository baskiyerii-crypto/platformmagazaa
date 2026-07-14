import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { outdoorEntrySchema } from "@magaza/shared";
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
    updateData = {
      subTypeId: formData.get("subTypeId") || entry.subTypeId,
      en: Number(formData.get("en") ?? entry.en),
      boy: Number(formData.get("boy") ?? entry.boy),
      adet: Number(formData.get("adet") ?? entry.adet),
      note: formData.get("note") ?? entry.note,
    };
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
  } else {
    const body = await request.json();
    const parsed = outdoorEntrySchema.partial().safeParse(body);
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
