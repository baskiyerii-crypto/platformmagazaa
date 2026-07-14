import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { updateCatalogRequestStatusSchema, isStaffRole } from "@magaza/shared";
import {
  createCatalogStatusHistory,
  validateCatalogStatusTransition,
} from "@/lib/catalog-request";

export const GET = withAuthParams<{ id: string }>(async (_request, auth, context) => {
  const { id } = await context.params;
  const catalogRequest = await prisma.catalogRequest.findUnique({
    where: { id },
    include: {
      store: { select: { id: true, name: true } },
      catalogItem: true,
      history: {
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!catalogRequest) return jsonError("Talep bulunamadı", 404);
  if (
    auth.role === "STORE" &&
    catalogRequest.storeId !== auth.storeId
  ) {
    return jsonError("Yetkisiz erişim", 403);
  }

  return NextResponse.json(catalogRequest);
});

import { notifyStoreUsers } from "@/lib/notify";

export const PATCH = withAuthParams<{ id: string }>(async (request, auth, context) => {
  const { id } = await context.params;
  const catalogRequest = await prisma.catalogRequest.findUnique({ where: { id } });
  if (!catalogRequest) return jsonError("Talep bulunamadı", 404);

  if (auth.role === "STORE") {
    return jsonError("Mağaza durum güncelleyemez", 403);
  }

  if (!isStaffRole(auth.role)) {
    return jsonError("Yetkisiz erişim", 403);
  }

  const body = await request.json();
  const parsed = updateCatalogRequestStatusSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
  }

  const error = validateCatalogStatusTransition(
    catalogRequest.status,
    parsed.data.status
  );
  if (error) return jsonError(error, 400);

  const updated = await prisma.catalogRequest.update({
    where: { id },
    data: {
      status: parsed.data.status,
      adminNote: parsed.data.adminNote,
      completedAt:
        parsed.data.status === "TAMAMLANDI" ||
        parsed.data.status === "MAGAZADA_GUNCELLENDI"
          ? new Date()
          : catalogRequest.completedAt,
    },
    include: {
      store: { select: { name: true } },
      catalogItem: true,
    },
  });

  await createCatalogStatusHistory(
    prisma,
    id,
    catalogRequest.status,
    parsed.data.status,
    auth.userId,
    parsed.data.adminNote
  );

  await notifyStoreUsers(catalogRequest.storeId, {
    type: "CATALOG_REQUEST",
    title: "Ürün Talebi Güncellendi",
    body: `${updated.catalogItem.name} — ${parsed.data.status}`,
    linkUrl: "/store/catalog",
  });

  return NextResponse.json(updated);
});

export const DELETE = withAuthParams<{ id: string }>(async (_request, auth, context) => {
  const { id } = await context.params;
  const catalogRequest = await prisma.catalogRequest.findUnique({ where: { id } });
  if (!catalogRequest) return jsonError("Talep bulunamadı", 404);

  if (auth.role === "STORE") {
    if (catalogRequest.storeId !== auth.storeId) {
      return jsonError("Yetkisiz erişim", 403);
    }
    if (catalogRequest.status !== "TALEP_OLUSTURULDU") {
      return jsonError("Sadece yeni talepler iptal edilebilir", 400);
    }
  } else if (!isStaffRole(auth.role)) {
    return jsonError("Yetkisiz erişim", 403);
  }

  await prisma.catalogRequest.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
