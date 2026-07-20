import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import { createAvmEntrySchema, isStaffRole, parseNumber } from "@magaza/shared";
import { saveUploadedFile } from "@/lib/upload";

function sanitizeAvmNumbers(body: {
  vitrins?: Array<Record<string, unknown>>;
  videos?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}): { ok: true; body: typeof body } | { ok: false; error: string } {
  const vitrins = (body.vitrins ?? []).map((v, i) => {
    const en = parseNumber(v.en);
    const boy = parseNumber(v.boy);
    if (en == null || en <= 0) return { error: `Vitrin ${i + 1}: En geçerli bir sayı olmalı` as const };
    if (boy == null || boy <= 0) return { error: `Vitrin ${i + 1}: Boy geçerli bir sayı olmalı` as const };
    const camEn = v.camEn != null && v.camEn !== "" ? parseNumber(v.camEn) : null;
    const camBoy = v.camBoy != null && v.camBoy !== "" ? parseNumber(v.camBoy) : null;
    if (v.camEn != null && v.camEn !== "" && (camEn == null || camEn <= 0)) {
      return { error: `Vitrin ${i + 1}: Cam en geçerli bir sayı olmalı` as const };
    }
    if (v.camBoy != null && v.camBoy !== "" && (camBoy == null || camBoy <= 0)) {
      return { error: `Vitrin ${i + 1}: Cam boy geçerli bir sayı olmalı` as const };
    }
    const siraNo = parseNumber(v.siraNo) ?? (i + 1);
    return {
      value: {
        ...v,
        siraNo,
        en,
        boy,
        camEn,
        camBoy,
      },
    };
  });
  for (const v of vitrins) {
    if ("error" in v) return { ok: false, error: v.error };
  }

  const videos = (body.videos ?? []).map((v, i) => {
    const adet = parseNumber(v.adet);
    if (adet == null || !Number.isInteger(adet) || adet < 1) {
      return { error: `Video ${i + 1}: Adet en az 1 olmalı` as const };
    }
    const en = v.en != null && v.en !== "" ? parseNumber(v.en) : null;
    const boy = v.boy != null && v.boy !== "" ? parseNumber(v.boy) : null;
    if (v.en != null && v.en !== "" && (en == null || en <= 0)) {
      return { error: `Video ${i + 1}: En geçerli bir sayı olmalı` as const };
    }
    if (v.boy != null && v.boy !== "" && (boy == null || boy <= 0)) {
      return { error: `Video ${i + 1}: Boy geçerli bir sayı olmalı` as const };
    }
    return { value: { ...v, adet, en, boy } };
  });
  for (const v of videos) {
    if ("error" in v) return { ok: false, error: v.error };
  }

  return {
    ok: true,
    body: {
      ...body,
      vitrins: vitrins.map((v) => ("value" in v ? v.value : v)),
      videos: videos.map((v) => ("value" in v ? v.value : v)),
    },
  };
}

export const GET = withAuth(async (request, auth) => {
  const storeIdParam = new URL(request.url).searchParams.get("storeId");
  const storeId =
    auth.role === "STORE"
      ? auth.storeId ?? undefined
      : isStaffRole(auth.role)
        ? storeIdParam ?? undefined
        : undefined;
  if (auth.role === "STORE" && !storeId) {
    return jsonError("Mağaza bulunamadı", 404);
  }

  const entries = await prisma.avmEntry.findMany({
    where: storeId ? { storeId } : {},
    select: {
      id: true,
      subType: { select: { name: true, code: true } },
      vitrins: {
        orderBy: { siraNo: "asc" },
        select: {
          id: true,
          kind: true,
          siraNo: true,
          en: true,
          boy: true,
          camEn: true,
          camBoy: true,
          konum: true,
          gorselUrl: true,
        },
      },
      videos: {
        select: { id: true, adet: true, placement: { select: { name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(entries);
});

export const POST = withAuth(async (request, auth) => {
  const contentType = request.headers.get("content-type") ?? "";
  let body: unknown;
  let storeIdParam: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      storeIdParam = formData.get("storeId")?.toString() ?? null;
      const vitrinsRaw = formData.get("vitrins")?.toString() ?? "[]";
      const videosRaw = formData.get("videos")?.toString() ?? "[]";
      const vitrinsParsed = JSON.parse(vitrinsRaw) as Array<Record<string, unknown>>;
      const vitrins = await Promise.all(
        vitrinsParsed.map(async (v, i) => {
          const file = formData.get(`vitrinFile_${i}`);
          let gorselUrl = v.gorselUrl as string | null | undefined;
          if (file instanceof File && file.size > 0) {
            gorselUrl = await saveUploadedFile(file, {
              category: "AVM_VITRIN",
              storeId: auth.role === "STORE" ? auth.storeId : storeIdParam,
              createdById: auth.userId,
            });
          }
          if (!gorselUrl) {
            throw new Error(`Vitrin ${i + 1} için fotoğraf zorunlu`);
          }
          return { ...v, gorselUrl };
        })
      );
      body = {
        subTypeId: formData.get("subTypeId")?.toString(),
        note: formData.get("note")?.toString() || null,
        vitrins,
        videos: JSON.parse(videosRaw),
      };
    } catch (err) {
      return jsonError(err instanceof Error ? err.message : "Geçersiz form verisi", 400);
    }
  } else {
    body = await request.json();
    storeIdParam = (body as { storeId?: string }).storeId ?? null;
  }

  const storeId =
    auth.role === "STORE"
      ? auth.storeId
      : isStaffRole(auth.role)
        ? storeIdParam
        : null;

  if (!storeId) {
    return jsonError(
      auth.role === "STORE" ? "Mağaza bulunamadı" : "Mağaza seçimi zorunlu",
      auth.role === "STORE" ? 404 : 400
    );
  }

  const sanitized = sanitizeAvmNumbers(body as {
    vitrins?: Array<Record<string, unknown>>;
    videos?: Array<Record<string, unknown>>;
  });
  if (!sanitized.ok) return jsonError(sanitized.error, 400);

  const parsed = createAvmEntrySchema.safeParse(sanitized.body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
  }

  const entry = await prisma.avmEntry.create({
    data: {
      storeId,
      subTypeId: parsed.data.subTypeId,
      note: parsed.data.note,
      vitrins: {
        create: parsed.data.vitrins.map((v) => ({
          kind: v.kind ?? "VITRIN",
          siraNo: v.siraNo,
          en: v.en,
          boy: v.boy,
          camEn: v.kind === "EKSTRA_ALAN" ? null : v.camEn,
          camBoy: v.kind === "EKSTRA_ALAN" ? null : v.camBoy,
          konum: v.kind === "EKSTRA_ALAN" ? v.konum?.trim() ?? null : null,
          gorselUrl: v.gorselUrl,
        })),
      },
      videos: {
        create: parsed.data.videos.map((v) => ({
          placementId: v.placementId,
          adet: v.adet,
          en: v.en,
          boy: v.boy,
        })),
      },
    },
    include: {
      subType: true,
      vitrins: true,
      videos: { include: { placement: true } },
    },
  });

  return NextResponse.json(entry, { status: 201 });
});
