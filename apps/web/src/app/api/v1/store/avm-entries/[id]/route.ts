import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { saveUploadedFile } from "@/lib/upload";
import { cleanupMediaUrls, replaceMediaUrl } from "@/lib/media-cleanup";

export const PATCH = withAuthParams<{ id: string }>(async (request, auth, context) => {
  const { id } = await context.params;
  const entry = await prisma.avmEntry.findUnique({
    where: { id },
    include: { vitrins: true },
  });

  if (!entry) return jsonError("Kayıt bulunamadı", 404);
  if (auth.role === "STORE" && entry.storeId !== auth.storeId) {
    return jsonError("Yetkisiz erişim", 403);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const vitrinId = formData.get("vitrinId") as string;
    const file = formData.get("file") as File | null;

    if (!vitrinId || !file) {
      return jsonError("Vitrin ID ve dosya gerekli", 400);
    }

    const vitrin = entry.vitrins.find((v) => v.id === vitrinId);
    if (!vitrin) return jsonError("Vitrin bulunamadı", 404);

    const url = await saveUploadedFile(file, {
      category: "AVM_VITRIN",
      storeId: entry.storeId,
      createdById: auth.userId,
      sourceRef: `avm-vitrin:${vitrinId}`,
    });
    await replaceMediaUrl(vitrin.gorselUrl, url);
    const updated = await prisma.avmVitrin.update({
      where: { id: vitrinId },
      data: { gorselUrl: url },
    });
    return NextResponse.json(updated);
  }

  const body = await request.json();
  const oldUrls = entry.vitrins.map((v) => v.gorselUrl);

  const updated = await prisma.avmEntry.update({
    where: { id },
    data: {
      note: body.note,
      vitrins: body.vitrins
        ? {
            deleteMany: {},
            create: body.vitrins.map(
              (v: {
                kind?: "VITRIN" | "EKSTRA_ALAN";
                siraNo: number;
                en: number;
                boy: number;
                camEn?: number | null;
                camBoy?: number | null;
                konum?: string | null;
                gorselUrl?: string | null;
              }) => ({
                kind: v.kind ?? "VITRIN",
                siraNo: v.siraNo,
                en: v.en,
                boy: v.boy,
                camEn: v.kind === "EKSTRA_ALAN" ? null : v.camEn,
                camBoy: v.kind === "EKSTRA_ALAN" ? null : v.camBoy,
                konum: v.kind === "EKSTRA_ALAN" ? v.konum?.trim() ?? null : null,
                gorselUrl: v.gorselUrl,
              })
            ),
          }
        : undefined,
      videos: body.videos
        ? {
            deleteMany: {},
            create: body.videos.map(
              (v: {
                placementId: string;
                adet: number;
                en?: number | null;
                boy?: number | null;
              }) => ({
                placementId: v.placementId,
                adet: v.adet,
                en: v.en,
                boy: v.boy,
              })
            ),
          }
        : undefined,
    },
    include: {
      subType: true,
      vitrins: true,
      videos: { include: { placement: true } },
    },
  });

  const newUrls = new Set(updated.vitrins.map((v) => v.gorselUrl).filter(Boolean));
  const removed = oldUrls.filter((url) => url && !newUrls.has(url));
  await cleanupMediaUrls(removed);

  return NextResponse.json(updated);
});

export const DELETE = withAuthParams<{ id: string }>(async (_request, auth, context) => {
  const { id } = await context.params;
  const entry = await prisma.avmEntry.findUnique({
    where: { id },
    include: { vitrins: true },
  });
  if (!entry) return jsonError("Kayıt bulunamadı", 404);
  if (auth.role === "STORE" && entry.storeId !== auth.storeId) {
    return jsonError("Yetkisiz erişim", 403);
  }

  await cleanupMediaUrls(entry.vitrins.map((v) => v.gorselUrl));
  await prisma.avmEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
