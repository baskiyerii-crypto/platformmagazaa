import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import {
  outdoorEntrySchema,
  isStaffRole,
  requirePositiveNumber,
  requireIntMin,
} from "@magaza/shared";
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

  const entries = await prisma.outdoorEntry.findMany({
    where: storeId ? { storeId } : {},
    select: {
      id: true,
      en: true,
      boy: true,
      adet: true,
      note: true,
      gorselUrl: true,
      subType: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(entries);
});

function parseOutdoorNumbers(raw: {
  en: unknown;
  boy: unknown;
  adet: unknown;
}): { en: number; boy: number; adet: number } | { error: string } {
  const en = requirePositiveNumber(raw.en, "En");
  if ("error" in en) return en;
  const boy = requirePositiveNumber(raw.boy, "Boy");
  if ("error" in boy) return boy;
  const adet = requireIntMin(raw.adet ?? 1, "Adet", 1);
  if ("error" in adet) return adet;
  return { en: en.value, boy: boy.value, adet: adet.value };
}

export const POST = withAuth(async (request, auth) => {
  const contentType = request.headers.get("content-type") ?? "";
  let data: Record<string, unknown>;
  let gorselUrl: string | null = null;
  let storeIdParam: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    storeIdParam = formData.get("storeId")?.toString() ?? null;
    const nums = parseOutdoorNumbers({
      en: formData.get("en"),
      boy: formData.get("boy"),
      adet: formData.get("adet") ?? 1,
    });
    if ("error" in nums) return jsonError(nums.error, 400);
    data = {
      subTypeId: formData.get("subTypeId"),
      en: nums.en,
      boy: nums.boy,
      adet: nums.adet,
      note: formData.get("note") || null,
    };
    const file = formData.get("file") as File | null;
    if (file && file.size > 0) {
      gorselUrl = await saveUploadedFile(file, {
        category: "OUTDOOR",
        storeId: auth.role === "STORE" ? auth.storeId : storeIdParam,
        createdById: auth.userId,
      });
    }
  } else {
    data = await request.json();
    storeIdParam = (data.storeId as string) ?? null;
    const nums = parseOutdoorNumbers({
      en: data.en,
      boy: data.boy,
      adet: data.adet ?? 1,
    });
    if ("error" in nums) return jsonError(nums.error, 400);
    data = { ...data, ...nums };
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

  const parsed = outdoorEntrySchema.safeParse(data);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
  }

  const entry = await prisma.outdoorEntry.create({
    data: {
      storeId,
      ...parsed.data,
      gorselUrl: gorselUrl ?? parsed.data.gorselUrl,
    },
    include: { subType: true },
  });

  return NextResponse.json(entry, { status: 201 });
});
