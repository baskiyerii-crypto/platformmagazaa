import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { deleteUploadedFile, saveUploadedFile } from "@/lib/upload";

const STORE_TRANSITIONS = {
  OKUNDU: ["BEKLIYOR"],
  ISLEME_ALINDI: ["OKUNDU"],
  TAMAMLANDI: ["ISLEME_ALINDI"],
} as const;

type Action = keyof typeof STORE_TRANSITIONS;

async function getStoreReceipt(announcementId: string, storeId: string) {
  let receipt = await prisma.announcementReceipt.findUnique({
    where: {
      announcementId_storeId: {
        announcementId,
        storeId,
      },
    },
  });

  if (!receipt) {
    const announcement = await prisma.announcement.findFirst({
      where: {
        id: announcementId,
        active: true,
        OR: [
          { audience: "ALL_STORES" },
          { audience: "SELECTED_STORES", storeIds: { has: storeId } },
        ],
      },
    });
    if (!announcement) return null;

    receipt = await prisma.announcementReceipt.create({
      data: {
        announcementId,
        storeId,
        status: "BEKLIYOR",
      },
    });
  }

  return receipt;
}

async function uploadCompletionFiles(
  files: File[],
  storeId: string,
  userId: string,
  announcementId: string
) {
  const uploaded: string[] = [];
  for (const file of files) {
    const url = await saveUploadedFile(file, {
      category: "ANNOUNCEMENT_COMPLETION",
      storeId,
      createdById: userId,
      sourceRef: `announcement:${announcementId}`,
    });
    uploaded.push(url);
  }
  return uploaded;
}

export const POST = withAuthParams<{ id: string }>(
  async (request, auth, context) => {
    if (auth.role !== "STORE" || !auth.storeId) {
      return jsonError("Sadece mağaza kullanıcıları işlem yapabilir", 403);
    }

    const { id: announcementId } = await context.params;
    const contentType = request.headers.get("content-type") ?? "";

    let action: Action | null = null;
    let note: string | null = null;
    const files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      action = (form.get("action")?.toString() ?? null) as Action | null;
      note = form.get("note")?.toString() || null;
      for (const [key, value] of form.entries()) {
        if (key.startsWith("file") && value instanceof File && value.size > 0) {
          files.push(value);
        }
      }
    } else {
      const body = await request.json();
      action = body.action as Action;
      note = body.note ?? null;
    }

    if (!action || !(action in STORE_TRANSITIONS)) {
      return jsonError("Geçersiz işlem. OKUNDU, ISLEME_ALINDI veya TAMAMLANDI olmalı", 400);
    }

    const receipt = await getStoreReceipt(announcementId, auth.storeId);
    if (!receipt) return jsonError("Duyuru bulunamadı", 404);

    const allowedFrom = STORE_TRANSITIONS[action];
    if (!(allowedFrom as readonly string[]).includes(receipt.status) && receipt.status !== action) {
      return jsonError(`Bu işlem için durum uygun değil (şu an: ${receipt.status})`, 400);
    }

    if (receipt.status === action && action !== "TAMAMLANDI") {
      return NextResponse.json(receipt);
    }

    const now = new Date();
    let completionImages = receipt.completionImages;

    if (action === "TAMAMLANDI") {
      const isAddingMore = receipt.status === "TAMAMLANDI";
      if (files.length === 0 && !isAddingMore && completionImages.length === 0) {
        return jsonError("Tamamlama için en az bir görsel yükleyin", 400);
      }
      if (isAddingMore && files.length === 0) {
        return jsonError("Eklenecek görsel seçin", 400);
      }
      if (files.length > 0) {
        const uploaded = await uploadCompletionFiles(
          files,
          auth.storeId,
          auth.userId,
          announcementId
        );
        completionImages = [...completionImages, ...uploaded];
      }
    }

    const updated = await prisma.announcementReceipt.update({
      where: { id: receipt.id },
      data: {
        status: action,
        note: note ?? receipt.note,
        completionImages,
        ...(action === "OKUNDU" ? { readAt: receipt.readAt ?? now } : {}),
        ...(action === "ISLEME_ALINDI"
          ? {
              readAt: receipt.readAt ?? now,
              processingAt: receipt.processingAt ?? now,
            }
          : {}),
        ...(action === "TAMAMLANDI"
          ? {
              readAt: receipt.readAt ?? now,
              processingAt: receipt.processingAt ?? now,
              completedAt: receipt.completedAt ?? now,
            }
          : {}),
      },
    });

    return NextResponse.json(updated);
  }
);

/** Görsel ekle / sil / değiştir (tamamlandıktan sonra da) */
export const PATCH = withAuthParams<{ id: string }>(
  async (request, auth, context) => {
    if (auth.role !== "STORE" || !auth.storeId) {
      return jsonError("Sadece mağaza kullanıcıları işlem yapabilir", 403);
    }

    const { id: announcementId } = await context.params;
    const receipt = await getStoreReceipt(announcementId, auth.storeId);
    if (!receipt) return jsonError("Duyuru bulunamadı", 404);

    if (receipt.status !== "ISLEME_ALINDI" && receipt.status !== "TAMAMLANDI") {
      return jsonError("Görsel yönetimi için önce işleme alın", 400);
    }

    const contentType = request.headers.get("content-type") ?? "";
    let op: string | null = null;
    let imageUrl: string | null = null;
    const files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      op = form.get("action")?.toString() ?? null;
      imageUrl = form.get("imageUrl")?.toString() || null;
      for (const [key, value] of form.entries()) {
        if (key.startsWith("file") && value instanceof File && value.size > 0) {
          files.push(value);
        }
      }
    } else {
      const body = await request.json();
      op = body.action ?? null;
      imageUrl = body.imageUrl ?? null;
    }

    if (!op || !["ADD_IMAGES", "REMOVE_IMAGE", "REPLACE_IMAGE"].includes(op)) {
      return jsonError("Geçersiz işlem. ADD_IMAGES, REMOVE_IMAGE veya REPLACE_IMAGE olmalı", 400);
    }

    let completionImages = [...receipt.completionImages];

    if (op === "ADD_IMAGES") {
      if (!files.length) return jsonError("En az bir görsel seçin", 400);
      const uploaded = await uploadCompletionFiles(
        files,
        auth.storeId,
        auth.userId,
        announcementId
      );
      completionImages = [...completionImages, ...uploaded];
    }

    if (op === "REMOVE_IMAGE") {
      if (!imageUrl || !completionImages.includes(imageUrl)) {
        return jsonError("Silinecek görsel bulunamadı", 404);
      }
      if (receipt.status === "TAMAMLANDI" && completionImages.length <= 1) {
        return jsonError("Tamamlanmış duyuruda en az bir görsel kalmalıdır", 400);
      }
      completionImages = completionImages.filter((u) => u !== imageUrl);
      await deleteUploadedFile(imageUrl);
    }

    if (op === "REPLACE_IMAGE") {
      if (!imageUrl || !completionImages.includes(imageUrl)) {
        return jsonError("Değiştirilecek görsel bulunamadı", 404);
      }
      if (files.length !== 1) {
        return jsonError("Değiştirmek için tek bir yeni görsel seçin", 400);
      }
      const [uploaded] = await uploadCompletionFiles(
        files,
        auth.storeId,
        auth.userId,
        announcementId
      );
      completionImages = completionImages.map((u) => (u === imageUrl ? uploaded : u));
      await deleteUploadedFile(imageUrl);
    }

    const updated = await prisma.announcementReceipt.update({
      where: { id: receipt.id },
      data: { completionImages },
    });

    return NextResponse.json(updated);
  }
);
