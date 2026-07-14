import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import { createAvmEntrySchema, isStaffRole } from "@magaza/shared";
import { saveUploadedFile } from "@/lib/upload";

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

  const parsed = createAvmEntrySchema.safeParse(body);
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
