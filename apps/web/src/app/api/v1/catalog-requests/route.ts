import { NextResponse } from "next/server";
import { prisma, ChangeRequestStatus } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import { createCatalogRequestSchema, isStaffRole, parsePagination, paginatedResponse } from "@magaza/shared";
import { createCatalogStatusHistory } from "@/lib/catalog-request";
import { saveUploadedFile } from "@/lib/upload";
import { notifyStaff } from "@/lib/notify";
import { cleanupMediaUrls } from "@/lib/media-cleanup";

function resolveStoreId(
  auth: { role: string; storeId?: string | null },
  storeIdParam?: string | null
): string | null {
  if (auth.role === "STORE") return auth.storeId ?? null;
  if (isStaffRole(auth.role as "ADMIN" | "MANAGER" | "STORE")) return storeIdParam ?? null;
  return null;
}

export const GET = withAuth(async (request, auth) => {
  const { searchParams } = new URL(request.url);
  const { page, limit, skip, take } = parsePagination(searchParams);
  const status = searchParams.get("status");
  const storeIdParam = searchParams.get("storeId");
  const catalogItemId = searchParams.get("catalogItemId");
  const detail = searchParams.get("detail") === "true";

  const where: {
    storeId?: string;
    status?: ChangeRequestStatus;
    catalogItemId?: string;
  } = {};

  if (auth.role === "STORE") {
    if (!auth.storeId) return jsonError("Mağaza bulunamadı", 404);
    where.storeId = auth.storeId;
  } else if (storeIdParam) {
    where.storeId = storeIdParam;
  }

  if (status) where.status = status as ChangeRequestStatus;
  if (catalogItemId) where.catalogItemId = catalogItemId;

  const [items, total] = await Promise.all([
    prisma.catalogRequest.findMany({
      where,
      include: detail
        ? {
            store: { select: { id: true, name: true } },
            catalogItem: true,
            history: {
              include: { user: { select: { username: true } } },
              orderBy: { createdAt: "desc" },
            },
          }
        : {
            store: { select: { id: true, name: true } },
            catalogItem: { select: { id: true, name: true, type: true, referenceImageUrl: true } },
          },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.catalogRequest.count({ where }),
  ]);

  return NextResponse.json(paginatedResponse(items, total, page, limit));
});

export const POST = withAuth(async (request, auth) => {
  const contentType = request.headers.get("content-type") ?? "";
  let body: Record<string, unknown> = {};
  let storeImageUrl: string | null = null;
  let storeIdParam: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    storeIdParam = formData.get("storeId")?.toString() ?? null;
    body = {
      catalogItemId: formData.get("catalogItemId")?.toString(),
      quantity: formData.get("quantity") ? Number(formData.get("quantity")) : null,
      note: formData.get("note")?.toString() || null,
    };
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      storeImageUrl = await saveUploadedFile(file, {
        category: "CATALOG_REQUEST",
        storeId: auth.role === "STORE" ? auth.storeId : storeIdParam,
        createdById: auth.userId,
      });
    }
  } else {
    body = await request.json();
    storeIdParam = (body.storeId as string) ?? null;
    storeImageUrl = (body.storeImageUrl as string) ?? null;
  }

  const storeId = resolveStoreId(auth, storeIdParam);
  if (!storeId) {
    return jsonError(
      auth.role === "STORE" ? "Mağaza bulunamadı" : "Mağaza seçimi zorunlu",
      auth.role === "STORE" ? 404 : 400
    );
  }

  const parsed = createCatalogRequestSchema.safeParse({ ...body, storeImageUrl });
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
  }

  const catalogItem = await prisma.catalogItem.findUnique({
    where: { id: parsed.data.catalogItemId },
  });
  if (!catalogItem || !catalogItem.active) {
    return jsonError("Ürün bulunamadı", 404);
  }

  if (catalogItem.type === "VARIABLE" && (!parsed.data.quantity || parsed.data.quantity < 1)) {
    return jsonError("Değişken ürünler için adet zorunlu", 400);
  }

  const openRequest = await prisma.catalogRequest.findFirst({
    where: {
      storeId,
      catalogItemId: parsed.data.catalogItemId,
      status: { notIn: ["MAGAZADA_GUNCELLENDI", "REDDEDILDI"] },
    },
  });
  if (openRequest) {
    return jsonError("Bu ürün için açık bir talep zaten var", 400);
  }

  const catalogRequest = await prisma.catalogRequest.create({
    data: {
      storeId,
      catalogItemId: parsed.data.catalogItemId,
      quantity: catalogItem.type === "VARIABLE" ? parsed.data.quantity : null,
      note: parsed.data.note,
      storeImageUrl,
      status: "TALEP_OLUSTURULDU",
    },
    include: {
      store: { select: { name: true } },
      catalogItem: true,
    },
  });

  await createCatalogStatusHistory(
    prisma,
    catalogRequest.id,
    null,
    "TALEP_OLUSTURULDU",
    auth.userId,
    parsed.data.note
  );

  if (auth.role === "STORE") {
    await notifyStaff({
      type: "CATALOG_REQUEST",
      title: "Yeni Ürün Talebi",
      body: `${catalogRequest.store.name} — ${catalogItem.name}`,
      linkUrl: "/admin/requests",
    });
  }

  return NextResponse.json(catalogRequest, { status: 201 });
});

export const DELETE = withAuth(async (request, auth) => {
  if (!isStaffRole(auth.role)) {
    return jsonError("Sadece yönetici talepleri silebilir", 403);
  }

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
    : [];
  if (ids.length === 0) {
    return jsonError("Silinecek talep seçin", 400);
  }

  const requests = await prisma.catalogRequest.findMany({
    where: { id: { in: ids } },
    select: { id: true, storeImageUrl: true },
  });
  const imageUrls = requests.map((r) => r.storeImageUrl);

  const result = await prisma.catalogRequest.deleteMany({
    where: { id: { in: ids } },
  });
  await cleanupMediaUrls(imageUrls);

  return NextResponse.json({ success: true, deleted: result.count });
});
