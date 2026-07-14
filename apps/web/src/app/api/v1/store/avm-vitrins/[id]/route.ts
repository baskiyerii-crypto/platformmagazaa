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
    if (!file?.size) return jsonError("Dosya gerekli", 400);
    const url = await saveUploadedFile(file, {
      category: "AVM_VITRIN",
      storeId: vitrin.avmEntry.storeId,
      createdById: auth.userId,
      sourceRef: `avm-vitrin:${id}`,
    });
    await replaceMediaUrl(vitrin.gorselUrl, url);
    const updated = await prisma.avmVitrin.update({
      where: { id },
      data: { gorselUrl: url },
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
      en: parsed.data.en,
      boy: parsed.data.boy,
      kind,
      camEn: kind === "EKSTRA_ALAN" ? null : parsed.data.camEn,
      camBoy: kind === "EKSTRA_ALAN" ? null : parsed.data.camBoy,
      konum: kind === "EKSTRA_ALAN" ? parsed.data.konum?.trim() ?? vitrin.konum : null,
      gorselUrl: parsed.data.gorselUrl,
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
