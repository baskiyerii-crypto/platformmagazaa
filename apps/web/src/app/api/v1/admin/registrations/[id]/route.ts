import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { reviewSignupRequestSchema } from "@magaza/shared";

export const PATCH = withAuthParams<{ id: string }>(
  async (request, auth, context) => {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = reviewSignupRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    const signup = await prisma.storeSignupRequest.findUnique({ where: { id } });
    if (!signup) return jsonError("Kayıt talebi bulunamadı", 404);
    if (signup.status !== "PENDING") {
      return jsonError("Bu talep zaten işlenmiş", 400);
    }

    if (parsed.data.action === "REJECT") {
      const updated = await prisma.storeSignupRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          adminNote: parsed.data.adminNote ?? null,
          reviewedById: auth.userId,
          reviewedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    const [existingStore, existingUser] = await Promise.all([
      prisma.store.findUnique({ where: { storeNumber: signup.storeNumber } }),
      prisma.user.findUnique({ where: { username: signup.username } }),
    ]);
    if (existingStore) return jsonError("Mağaza numarası artık kullanımda", 400);
    if (existingUser) return jsonError("Kullanıcı adı artık kullanımda", 400);

    const result = await prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          name: signup.storeName,
          storeNumber: signup.storeNumber,
          active: true,
        },
      });
      await tx.user.create({
        data: {
          username: signup.username,
          passwordHash: signup.passwordHash,
          role: "STORE",
          storeId: store.id,
        },
      });
      const updated = await tx.storeSignupRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          adminNote: parsed.data.adminNote ?? null,
          reviewedById: auth.userId,
          reviewedAt: new Date(),
        },
      });
      return { store, signup: updated };
    });

    return NextResponse.json(result);
  },
  { strictAdminOnly: true }
);
