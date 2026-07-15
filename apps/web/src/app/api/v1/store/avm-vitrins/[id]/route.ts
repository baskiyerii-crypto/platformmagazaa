import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { updateAvmVitrinSchema } from "@magaza/shared";
import { saveUploadedFile } from "@/lib/upload";
import { cleanupMediaUrls, replaceMediaUrl } from "@/lib/media-cleanup";

export const PATCH = withAuthParams<{ id: string }>(async (request, auth, context) => {
  const { id } = await context.params;
  const vitrin = await prisma.avmVitrin.findUnique({
    where: { id },
    include: { avmEntry: true },
  });

  if (!vitrin) return jsonError("Vitrin bulunamadı", 404);
  if (auth.role === "STORE" && vitrin.avmEntry.storeId !== auth.storeId) {
    return jsonError("Yetkisiz erişim", 403);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const data: {
      gorselUrl?: string;
      en?: number;
      boy?: number;
      kind?: "VITRIN" | "EKSTRA_ALAN";
      camEn?: number | null;
      camBoy?: number | null;
      konum?: string | null;
    } = {};

    const enRaw = formData.get("en");
    const boyRaw = formData.get("boy");
    if (enRaw != null && String(enRaw) !== "") data.en = Number(enRaw);
    if (boyRaw != null && String(boyRaw) !== "") data.boy = Number(boyRaw);

    const kindRaw = formData.get("kind");
    if (kindRaw === "VITRIN" || kindRaw === "EKSTRA_ALAN") {
      data.kind = kindRaw;
    }
    const kind = data.kind ?? vitrin.kind;

    if (kind === "EKSTRA_ALAN") {
      const konumRaw = formData.get("konum");
      if (konumRaw != null) data.konum = String(konumRaw).trim() || null;
      data.camEn = null;
      data.camBoy = null;
    } else {
      const camEnRaw = formData.get("camEn");
      const camBoyRaw = formData.get("camBoy");
      if (camEnRaw != null && String(camEnRaw) !== "") data.camEn = Number(camEnRaw);
      else if (formData.has("camEn")) data.camEn = null;
      if (camBoyRaw != null && String(camBoyRaw) !== "") data.camBoy = Number(camBoyRaw);
      else if (formData.has("camBoy")) data.camBoy = null;
      data.konum = null;
    }

    if (file?.size) {
      const url = await saveUploadedFile(file, {
        category: "AVM_VITRIN",
        storeId: vitrin.avmEntry.storeId,
        createdById: auth.userId,
        sourceRef: `avm-vitrin:${id}`,
      });
      await replaceMediaUrl(vitrin.gorselUrl, url);
      data.gorselUrl = url;
    } else if (!Object.keys(data).length) {
      return jsonError("Güncellenecek alan yok", 400);
    }

    const updated = await prisma.avmVitrin.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  }

  const body = await request.json();
  const parsed = updateAvmVitrinSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
  }

  const kind = parsed.data.kind ?? vitrin.kind;
  const updated = await prisma.avmVitrin.update({
    where: { id },
    data: {
      ...(parsed.data.en !== undefined ? { en: parsed.data.en } : {}),
      ...(parsed.data.boy !== undefined ? { boy: parsed.data.boy } : {}),
      kind,
      camEn: kind === "EKSTRA_ALAN" ? null : parsed.data.camEn,
      camBoy: kind === "EKSTRA_ALAN" ? null : parsed.data.camBoy,
      konum: kind === "EKSTRA_ALAN" ? parsed.data.konum?.trim() ?? vitrin.konum : null,
      ...(parsed.data.gorselUrl !== undefined
        ? { gorselUrl: parsed.data.gorselUrl }
        : {}),
    },
  });
  if (parsed.data.gorselUrl && parsed.data.gorselUrl !== vitrin.gorselUrl) {
    await replaceMediaUrl(vitrin.gorselUrl, parsed.data.gorselUrl);
  }
  return NextResponse.json(updated);
});

export const DELETE = withAuthParams<{ id: string }>(async (_request, auth, context) => {
  const { id } = await context.params;
  const vitrin = await prisma.avmVitrin.findUnique({
    where: { id },
    include: { avmEntry: { include: { vitrins: true } } },
  });

  if (!vitrin) return jsonError("Vitrin bulunamadı", 404);
  if (auth.role === "STORE" && vitrin.avmEntry.storeId !== auth.storeId) {
    return jsonError("Yetkisiz erişim", 403);
  }

  const urlsToClean: string[] = [];
  if (vitrin.gorselUrl) urlsToClean.push(vitrin.gorselUrl);

  if (vitrin.avmEntry.vitrins.length <= 1) {
    for (const v of vitrin.avmEntry.vitrins) {
      if (v.gorselUrl && v.id !== vitrin.id) urlsToClean.push(v.gorselUrl);
    }
    await prisma.avmEntry.delete({ where: { id: vitrin.avmEntryId } });
  } else {
    await prisma.avmVitrin.delete({ where: { id } });
  }

  await cleanupMediaUrls(urlsToClean);
  return NextResponse.json({ success: true });
});
