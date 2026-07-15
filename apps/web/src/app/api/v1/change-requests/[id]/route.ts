import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { updateChangeRequestStatusSchema, isStaffRole, CHANGE_REQUEST_STATUS_LABELS } from "@magaza/shared";
import {
  createStatusHistory,
  validateStatusTransition,
} from "@/lib/change-request";
import { resolveChangeRequestTarget } from "@/lib/server/resolve-change-request-target";
import { cleanupMediaUrls } from "@/lib/media-cleanup";
import { notifyStoreUsers } from "@/lib/notify";

export const GET = withAuthParams<{ id: string }>(async (_request, auth, context) => {
  const { id } = await context.params;
  const changeRequest = await prisma.changeRequest.findUnique({
    where: { id },
    include: {
      store: true,
      history: {
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: "desc" },
      },
      images: true,
    },
  });

  if (!changeRequest) return jsonError("Talep bulunamadı", 404);
  if (
    auth.role === "STORE" &&
    changeRequest.storeId !== auth.storeId
  ) {
    return jsonError("Yetkisiz erişim", 403);
  }

  const target = isStaffRole(auth.role)
    ? await resolveChangeRequestTarget(changeRequest.targetType, changeRequest.targetId)
    : null;

  return NextResponse.json({ ...changeRequest, target });
});

export const PATCH = withAuthParams<{ id: string }>(async (request, auth, context) => {
  const { id } = await context.params;
  const changeRequest = await prisma.changeRequest.findUnique({
    where: { id },
  });

  if (!changeRequest) return jsonError("Talep bulunamadı", 404);

  const body = await request.json();
  const parsed = updateChangeRequestStatusSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
  }

  if (!isStaffRole(auth.role)) {
    return jsonError("Sadece yönetici veya müdür durum güncelleyebilir", 403);
  }

  const error = validateStatusTransition(
    changeRequest.status,
    parsed.data.status,
    auth.role
  );
  if (error) return jsonError(error, 400);

  const updated = await prisma.changeRequest.update({
    where: { id },
    data: {
      status: parsed.data.status,
      adminNote: parsed.data.adminNote,
      completedAt:
        parsed.data.status === "MAGAZADA_GUNCELLENDI"
          ? new Date()
          : changeRequest.completedAt,
    },
  });

  await createStatusHistory(
    prisma,
    id,
    changeRequest.status,
    parsed.data.status,
    auth.userId,
    parsed.data.adminNote
  );

  await notifyStoreUsers(changeRequest.storeId, {
    type: "CHANGE_REQUEST",
    title: "Değişim Talebi Güncellendi",
    body: CHANGE_REQUEST_STATUS_LABELS[parsed.data.status],
    linkUrl: "/store/requests",
  });

  return NextResponse.json(updated);
});

export const DELETE = withAuthParams<{ id: string }>(async (_request, auth, context) => {
  const { id } = await context.params;
  const changeRequest = await prisma.changeRequest.findUnique({
    where: { id },
    include: { images: { select: { url: true } } },
  });
  if (!changeRequest) return jsonError("Talep bulunamadı", 404);

  if (!isStaffRole(auth.role)) {
    return jsonError("Sadece yönetici talepleri silebilir", 403);
  }

  const imageUrls = changeRequest.images.map((img) => img.url);
  await prisma.changeRequest.delete({ where: { id } });
  await cleanupMediaUrls(imageUrls);

  return NextResponse.json({ success: true });
});
