import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { updateAvmVitrinSchema, parseNumber } from "@magaza/shared";
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

    if (formData.has("en")) {
      const raw = formData.get("en");
      if (raw != null && String(raw).trim() !== "") {
        const n = parseNumber(raw);
        if (n == null || n <= 0) return jsonError("En geçerli bir sayı olmalı", 400);
        data.en = n;
      }
    }
    if (formData.has("boy")) {
      const raw = formData.get("boy");
      if (raw != null && String(raw).trim() !== "") {
        const n = parseNumber(raw);
        if (n == null || n <= 0) return jsonError("Boy geçerli bir sayı olmalı", 400);
        data.boy = n;
      }
    }

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
      if (formData.has("camEn")) {
        const camEnRaw = formData.get("camEn");
        if (camEnRaw != null && String(camEnRaw).trim() !== "") {
          const n = parseNumber(camEnRaw);
          if (n == null || n <= 0) return jsonError("Cam en geçerli bir sayı olmalı", 400);
          data.camEn = n;
        } else {
          data.camEn = null;
        }
      }
      if (formData.has("camBoy")) {
        const camBoyRaw = formData.get("camBoy");
        if (camBoyRaw != null && String(camBoyRaw).trim() !== "") {
          const n = parseNumber(camBoyRaw);
          if (n == null || n <= 0) return jsonError("Cam boy geçerli bir sayı olmalı", 400);
          data.camBoy = n;
        } else {
          data.camBoy = null;
        }
      }
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
  const normalized: Record<string, unknown> = { ...body };
  if ("en" in body && body.en != null) {
    const n = parseNumber(body.en);
    if (n == null) return jsonError("En geçerli bir sayı olmalı", 400);
    normalized.en = n;
  }
  if ("boy" in body && body.boy != null) {
    const n = parseNumber(body.boy);
    if (n == null) return jsonError("Boy geçerli bir sayı olmalı", 400);
    normalized.boy = n;
  }
  if ("camEn" in body && body.camEn != null) {
    const n = parseNumber(body.camEn);
    if (n == null) return jsonError("Cam en geçerli bir sayı olmalı", 400);
    normalized.camEn = n;
  }
  if ("camBoy" in body && body.camBoy != null) {
    const n = parseNumber(body.camBoy);
    if (n == null) return jsonError("Cam boy geçerli bir sayı olmalı", 400);
    normalized.camBoy = n;
  }

  const parsed = updateAvmVitrinSchema.safeParse(normalized);
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
