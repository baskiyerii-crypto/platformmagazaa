import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import { storeSignageEntrySchema, isStaffRole } from "@magaza/shared";
import { saveUploadedFile } from "@/lib/upload";
import {
  validatePlacement,
  validateReyonCategory,
  validateSignageSubType,
} from "@/lib/signage-validation";

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

  const entries = await prisma.storeSignageEntry.findMany({
    where: storeId ? { storeId } : {},
    select: {
      id: true,
      en: true,
      boy: true,
      adet: true,
      note: true,
      gorselUrl: true,
      subType: { select: { id: true, name: true } },
      placement: { select: { id: true, name: true } },
      reyonCategory: { select: { id: true, name: true, code: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(entries);
});

export const POST = withAuth(async (request, auth) => {
  const contentType = request.headers.get("content-type") ?? "";
  let data: Record<string, unknown>;
  let gorselUrl: string | null = null;
  let storeIdParam: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    storeIdParam = formData.get("storeId")?.toString() ?? null;
    data = {
      subTypeId: formData.get("subTypeId"),
      placementId: formData.get("placementId"),
      reyonCategoryId: formData.get("reyonCategoryId") || null,
      en: Number(formData.get("en")),
      boy: Number(formData.get("boy")),
      adet: Number(formData.get("adet") ?? 1),
      note: formData.get("note") || null,
    };
    const file = formData.get("file") as File | null;
    if (file && file.size > 0) {
      gorselUrl = await saveUploadedFile(file, {
        category: "STORE_SIGNAGE",
        storeId: auth.role === "STORE" ? auth.storeId : storeIdParam,
        createdById: auth.userId,
      });
    }
  } else {
    data = await request.json();
    storeIdParam = (data.storeId as string) ?? null;
    gorselUrl = (data.gorselUrl as string) ?? null;
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

  const parsed = storeSignageEntrySchema.safeParse(data);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
  }

  const subType = await validateSignageSubType(parsed.data.subTypeId);
  if (!subType) return jsonError("Geçersiz envanter türü", 400);

  const placement = await validatePlacement(parsed.data.placementId);
  if (!placement) return jsonError("Geçersiz konum", 400);

  if (parsed.data.reyonCategoryId) {
    const reyon = await validateReyonCategory(parsed.data.reyonCategoryId);
    if (!reyon) return jsonError("Geçersiz reyon kategorisi", 400);
  }

  const finalGorselUrl = gorselUrl ?? parsed.data.gorselUrl;
  if (!finalGorselUrl) {
    return jsonError("Fotoğraf zorunlu", 400);
  }

  const entry = await prisma.storeSignageEntry.create({
    data: {
      storeId,
      ...parsed.data,
      gorselUrl: finalGorselUrl,
    },
    include: { subType: true, placement: true, reyonCategory: true },
  });

  return NextResponse.json(entry, { status: 201 });
});
