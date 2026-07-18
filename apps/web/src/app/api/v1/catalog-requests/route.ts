import { NextResponse } from "next/server";
import { prisma, ChangeRequestStatus } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import {
  createCatalogRequestSchema,
  bulkCatalogRequestSchema,
  isStaffRole,
  parsePagination,
  paginatedResponse,
} from "@magaza/shared";
import { createCatalogStatusHistory } from "@/lib/catalog-request";
import { saveUploadedFile } from "@/lib/upload";
import { notifyStaff } from "@/lib/notify";
import { cleanupMediaUrls } from "@/lib/media-cleanup";
import { endOfDay, isCampaignOpenForRequests, startOfDay } from "@/lib/catalog-campaign";

function resolveStoreId(
  auth: { role: string; storeId?: string | null },
  storeIdParam?: string | null
): string | null {
  if (auth.role === "STORE") return auth.storeId ?? null;
  if (isStaffRole(auth.role as "ADMIN" | "MANAGER" | "STORE")) return storeIdParam ?? null;
  return null;
}

const CLOSED_STATUSES: ChangeRequestStatus[] = ["MAGAZADA_GUNCELLENDI", "REDDEDILDI"];

const catalogRequestInclude = {
  store: { select: { id: true, name: true } },
  campaign: { select: { id: true, name: true, mode: true } },
  catalogItem: {
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      referenceImageUrl: true,
      categoryId: true,
      category: { select: { id: true, name: true } },
    },
  },
} as const;

export const GET = withAuth(async (request, auth) => {
  const { searchParams } = new URL(request.url);
  const { page, limit, skip, take } = parsePagination(searchParams);
  const status = searchParams.get("status");
  const storeIdParam = searchParams.get("storeId");
  const catalogItemId = searchParams.get("catalogItemId");
  const campaignId = searchParams.get("campaignId");
  const categoryId = searchParams.get("categoryId");
  const scope = searchParams.get("scope");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const detail = searchParams.get("detail") === "true";

  const where: {
    storeId?: string;
    status?: ChangeRequestStatus;
    catalogItemId?: string;
    campaignId?: string | { not: null } | null;
    createdAt?: { gte?: Date; lte?: Date };
    catalogItem?: { categoryId?: string };
  } = {};

  if (auth.role === "STORE") {
    if (!auth.storeId) return jsonError("Mağaza bulunamadı", 404);
    where.storeId = auth.storeId;
  } else if (storeIdParam) {
    where.storeId = storeIdParam;
  }

  if (status) where.status = status as ChangeRequestStatus;
  if (catalogItemId) where.catalogItemId = catalogItemId;
  if (campaignId) where.campaignId = campaignId;
  else if (scope === "campaign") where.campaignId = { not: null };
  else if (scope === "product") where.campaignId = null;
  if (categoryId) where.catalogItem = { categoryId };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = startOfDay(new Date(dateFrom));
    if (dateTo) where.createdAt.lte = endOfDay(new Date(dateTo));
  }

  const [items, total] = await Promise.all([
    prisma.catalogRequest.findMany({
      where,
      include: detail
        ? {
            ...catalogRequestInclude,
            catalogItem: true,
            history: {
              include: { user: { select: { username: true } } },
              orderBy: { createdAt: "desc" },
            },
          }
        : catalogRequestInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.catalogRequest.count({ where }),
  ]);

  return NextResponse.json(paginatedResponse(items, total, page, limit));
});

async function createSingleRequest(args: {
  storeId: string;
  catalogItemId: string;
  quantity: number;
  note: string | null;
  storeImageUrl: string | null;
  userId: string;
  notify: boolean;
  /** When set, item must belong to this campaign. When null, item must be continuous product. */
  expectedCampaignId?: string | null;
}) {
  const catalogItem = await prisma.catalogItem.findUnique({
    where: { id: args.catalogItemId },
    include: { campaign: true },
  });
  if (!catalogItem || !catalogItem.active) {
    throw new Error("Ürün bulunamadı");
  }

  const itemCampaignId = catalogItem.campaignId ?? null;
  if (args.expectedCampaignId !== undefined) {
    if (args.expectedCampaignId === null && itemCampaignId !== null) {
      throw new Error("Kampanya ürünü sürekli ihtiyaç listesine eklenemez");
    }
    if (args.expectedCampaignId !== null && itemCampaignId !== args.expectedCampaignId) {
      throw new Error("Ürün seçilen kampanyaya ait değil");
    }
  }

  if (catalogItem.campaign && !isCampaignOpenForRequests(catalogItem.campaign)) {
    throw new Error("Bu kampanya şu an talep kabul etmiyor");
  }

  const openRequest = await prisma.catalogRequest.findFirst({
    where: {
      storeId: args.storeId,
      catalogItemId: args.catalogItemId,
      campaignId: itemCampaignId,
      status: { notIn: CLOSED_STATUSES },
    },
  });

  if (openRequest) {
    const updated = await prisma.catalogRequest.update({
      where: { id: openRequest.id },
      data: {
        quantity: args.quantity,
        campaignId: itemCampaignId,
        note: args.note,
        ...(args.storeImageUrl ? { storeImageUrl: args.storeImageUrl } : {}),
      },
      include: catalogRequestInclude,
    });
    await createCatalogStatusHistory(
      prisma,
      updated.id,
      openRequest.status,
      openRequest.status,
      args.userId,
      `Adet güncellendi: ${args.quantity}`
    );
    return { request: updated, created: false };
  }

  const catalogRequest = await prisma.catalogRequest.create({
    data: {
      storeId: args.storeId,
      campaignId: itemCampaignId,
      catalogItemId: args.catalogItemId,
      quantity: args.quantity,
      note: args.note,
      storeImageUrl: args.storeImageUrl,
      status: "TALEP_OLUSTURULDU",
    },
    include: catalogRequestInclude,
  });

  await createCatalogStatusHistory(
    prisma,
    catalogRequest.id,
    null,
    "TALEP_OLUSTURULDU",
    args.userId,
    null
  );

  if (args.notify) {
    const isCampaign = itemCampaignId != null;
    await notifyStaff({
      type: "CATALOG_REQUEST",
      title: isCampaign ? "Yeni Kampanya Talebi" : "Yeni Ürün Talebi",
      body: `${catalogRequest.store.name} — ${catalogItem.name} — ${args.quantity} adet`,
      linkUrl: isCampaign ? "/admin/campaign-requests" : "/admin/requests",
    });
  }

  return { request: catalogRequest, created: true };
}

export const POST = withAuth(async (request, auth) => {
  const contentType = request.headers.get("content-type") ?? "";
  let body: Record<string, unknown> = {};
  let storeImageUrl: string | null = null;
  let storeIdParam: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    storeIdParam = formData.get("storeId")?.toString() ?? null;
    const bulkRaw = formData.get("items")?.toString();
    if (bulkRaw) {
      try {
        body = {
          campaignId: formData.get("campaignId")?.toString(),
          items: JSON.parse(bulkRaw),
        };
      } catch {
        return jsonError("Geçersiz toplu talep verisi", 400);
      }
    } else {
      body = {
        catalogItemId: formData.get("catalogItemId")?.toString(),
        quantity: formData.get("quantity") ? Number(formData.get("quantity")) : null,
        note: auth.role === "STORE" ? null : formData.get("note")?.toString() || null,
        campaignId: formData.get("campaignId")?.toString() || null,
      };
    }
    const file = formData.get("file");
    if (auth.role !== "STORE" && file instanceof File && file.size > 0) {
      storeImageUrl = await saveUploadedFile(file, {
        category: "CATALOG_REQUEST",
        storeId: storeIdParam,
        createdById: auth.userId,
      });
    }
  } else {
    body = await request.json();
    storeIdParam = (body.storeId as string) ?? null;
    if (auth.role === "STORE") body.note = null;
    storeImageUrl =
      auth.role === "STORE" ? null : ((body.storeImageUrl as string) ?? null);
  }

  const storeId = resolveStoreId(auth, storeIdParam);
  if (!storeId) {
    return jsonError(
      auth.role === "STORE" ? "Mağaza bulunamadı" : "Mağaza seçimi zorunlu",
      auth.role === "STORE" ? 404 : 400
    );
  }

  // Bulk campaign submission
  if (Array.isArray(body.items)) {
    const parsed = bulkCatalogRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    const campaign = await prisma.catalogCampaign.findUnique({
      where: { id: parsed.data.campaignId },
    });
    if (!campaign) return jsonError("Kampanya bulunamadı", 404);
    if (!isCampaignOpenForRequests(campaign)) {
      return jsonError("Bu kampanya şu an talep kabul etmiyor", 400);
    }

    const itemIds = parsed.data.items.map((i) => i.catalogItemId);
    const catalogItems = await prisma.catalogItem.findMany({
      where: {
        id: { in: itemIds },
        active: true,
        campaignId: campaign.id,
      },
    });
    if (catalogItems.length !== itemIds.length) {
      return jsonError("Bazı ürünler bu kampanyada bulunamadı", 400);
    }

    const results = [];
    for (const line of parsed.data.items) {
      try {
        const result = await createSingleRequest({
          storeId,
          catalogItemId: line.catalogItemId,
          quantity: line.quantity,
          note: null,
          storeImageUrl: null,
          userId: auth.userId,
          notify: false,
          expectedCampaignId: campaign.id,
        });
        results.push(result.request);
      } catch (e) {
        return jsonError(e instanceof Error ? e.message : "Talep kaydedilemedi", 400);
      }
    }

    if (auth.role === "STORE") {
      const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { name: true },
      });
      const totalQty = parsed.data.items.reduce((s, i) => s + i.quantity, 0);
      await notifyStaff({
        type: "CATALOG_REQUEST",
        title: "Kampanya Adet Bildirimi",
        body: `${store?.name ?? "Mağaza"} — ${campaign.name} — ${parsed.data.items.length} ürün / ${totalQty} adet`,
        linkUrl: "/admin/campaign-requests",
      });
    }

    return NextResponse.json(
      { success: true, count: results.length, items: results },
      { status: 201 }
    );
  }

  // Single item (legacy / staff)
  const parsed = createCatalogRequestSchema.safeParse({ ...body, storeImageUrl });
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
  }

  try {
    const expectedCampaignId =
      typeof body.campaignId === "string" && body.campaignId
        ? body.campaignId
        : null;
    const { request: catalogRequest } = await createSingleRequest({
      storeId,
      catalogItemId: parsed.data.catalogItemId,
      quantity: parsed.data.quantity,
      note: auth.role === "STORE" ? null : (parsed.data.note ?? null),
      storeImageUrl,
      userId: auth.userId,
      notify: auth.role === "STORE",
      expectedCampaignId,
    });
    return NextResponse.json(catalogRequest, { status: 201 });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Talep oluşturulamadı", 400);
  }
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
