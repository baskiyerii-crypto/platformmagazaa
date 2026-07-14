import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { saveUploadedFile } from "@/lib/upload";

const STORE_TRANSITIONS = {
  OKUNDU: ["BEKLIYOR"],
  ISLEME_ALINDI: ["OKUNDU", "BEKLIYOR"],
  TAMAMLANDI: ["ISLEME_ALINDI"],
} as const;

type Action = keyof typeof STORE_TRANSITIONS;

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

    if (action === "TAMAMLANDI" && files.length === 0) {
      return jsonError("Tamamlama için en az bir görsel yükleyin", 400);
    }

    let receipt = await prisma.announcementReceipt.findUnique({
      where: {
        announcementId_storeId: {
          announcementId,
          storeId: auth.storeId,
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
            { audience: "SELECTED_STORES", storeIds: { has: auth.storeId } },
          ],
        },
      });
      if (!announcement) return jsonError("Duyuru bulunamadı", 404);

      receipt = await prisma.announcementReceipt.create({
        data: {
          announcementId,
          storeId: auth.storeId,
          status: "BEKLIYOR",
        },
      });
    }

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
      const uploaded: string[] = [];
      for (const file of files) {
        const url = await saveUploadedFile(file, {
          category: "ANNOUNCEMENT_COMPLETION",
          storeId: auth.storeId,
          createdById: auth.userId,
          sourceRef: `announcement:${announcementId}`,
        });
        uploaded.push(url);
      }
      completionImages = [...completionImages, ...uploaded];
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
              completedAt: now,
            }
          : {}),
      },
    });

    return NextResponse.json(updated);
  }
);
