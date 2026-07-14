import { NextResponse } from "next/server";
import { prisma, ChangeRequestStatus, ChangeTargetType } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import { createChangeRequestSchema, isStaffRole, parsePagination, paginatedResponse } from "@magaza/shared";
import { createStatusHistory } from "@/lib/change-request";
import { notifyStaff } from "@/lib/notify";
import { resolveChangeRequestTargets } from "@/lib/server/resolve-change-request-target";

export const GET = withAuth(async (request, auth) => {
  const { searchParams } = new URL(request.url);
  const { page, limit, skip, take } = parsePagination(searchParams);
  const status = searchParams.get("status");
  const storeIdParam = searchParams.get("storeId");
  const targetType = searchParams.get("targetType");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const detail = searchParams.get("detail") === "true";

  const where: {
    storeId?: string;
    status?: ChangeRequestStatus;
    targetType?: ChangeTargetType;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};

  if (auth.role === "STORE") {
    if (!auth.storeId) return jsonError("Mağaza bulunamadı", 404);
    where.storeId = auth.storeId;
  } else if (storeIdParam) {
    where.storeId = storeIdParam;
  }

  if (status) where.status = status as ChangeRequestStatus;
  if (targetType) where.targetType = targetType as ChangeTargetType;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const [items, total] = await Promise.all([
    detail
      ? prisma.changeRequest.findMany({
          where,
          include: {
            store: { select: { id: true, name: true } },
            history: {
              include: { user: { select: { username: true } } },
              orderBy: { createdAt: "desc" },
            },
            images: { orderBy: { createdAt: "desc" } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        })
      : prisma.changeRequest.findMany({
          where,
          include: { store: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
    prisma.changeRequest.count({ where }),
  ]);

  let enriched = items;
  if (detail && isStaffRole(auth.role)) {
    const targetMap = await resolveChangeRequestTargets(
      items.map((item) => ({ targetType: item.targetType, targetId: item.targetId }))
    );
    enriched = items.map((item) => ({
      ...item,
      target: targetMap.get(`${item.targetType}:${item.targetId}`) ?? null,
    }));
  }

  return NextResponse.json(paginatedResponse(enriched, total, page, limit));
});

export const POST = withAuth(async (request, auth) => {
  if (auth.role !== "STORE" || !auth.storeId) {
    return jsonError("Sadece mağaza kullanıcıları talep oluşturabilir", 403);
  }

  const body = await request.json();
  const parsed = createChangeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
  }

  const openRequest = await prisma.changeRequest.findFirst({
    where: {
      targetId: parsed.data.targetId,
      status: { notIn: ["MAGAZADA_GUNCELLENDI", "REDDEDILDI"] },
    },
  });

  if (openRequest) {
    return jsonError("Bu hedef için açık bir talep zaten var", 400);
  }

  const { targetType, targetId } = parsed.data;
  if (targetType === "AVM_VITRIN") {
    const vitrin = await prisma.avmVitrin.findFirst({
      where: { id: targetId, avmEntry: { storeId: auth.storeId } },
    });
    if (!vitrin) return jsonError("Hedef vitrin bulunamadı", 404);
  } else if (targetType === "OUTDOOR") {
    const outdoor = await prisma.outdoorEntry.findFirst({
      where: { id: targetId, storeId: auth.storeId },
    });
    if (!outdoor) return jsonError("Hedef açık hava kaydı bulunamadı", 404);
  } else if (targetType === "STORE_SIGNAGE") {
    const signage = await prisma.storeSignageEntry.findFirst({
      where: { id: targetId, storeId: auth.storeId },
    });
    if (!signage) return jsonError("Hedef mağaza içi kayıt bulunamadı", 404);
  } else if (targetType === "AVM_VIDEO") {
    const video = await prisma.avmVideo.findFirst({
      where: { id: targetId, avmEntry: { storeId: auth.storeId } },
    });
    if (!video) return jsonError("Hedef video kaydı bulunamadı", 404);
  }

  const changeRequest = await prisma.changeRequest.create({
    data: {
      storeId: auth.storeId,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      note: parsed.data.note,
      status: "TALEP_OLUSTURULDU",
    },
    include: { store: { select: { name: true } } },
  });

  await createStatusHistory(
    prisma,
    changeRequest.id,
    null,
    "TALEP_OLUSTURULDU",
    auth.userId,
    parsed.data.note
  );

  await notifyStaff({
    type: "CHANGE_REQUEST",
    title: "Yeni Değişim Talebi",
    body: `${changeRequest.store.name} — ${parsed.data.targetType}`,
    linkUrl: "/admin/requests",
  });

  return NextResponse.json(changeRequest, { status: 201 });
});
