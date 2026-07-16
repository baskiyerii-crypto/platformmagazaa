import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@magaza/database";
import { registerStoreSchema } from "@magaza/shared";
import { jsonError } from "@/lib/api-auth";
import { notifyStaff } from "@/lib/notify";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerStoreSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    const { storeName, storeNumber, username, password } = parsed.data;

    const [existingStore, existingUser, pendingNumber, pendingUser] = await Promise.all([
      prisma.store.findUnique({ where: { storeNumber } }),
      prisma.user.findUnique({ where: { username } }),
      prisma.storeSignupRequest.findFirst({
        where: { storeNumber, status: "PENDING" },
      }),
      prisma.storeSignupRequest.findFirst({
        where: { username, status: "PENDING" },
      }),
    ]);

    if (existingStore) return jsonError("Bu mağaza numarası zaten kayıtlı", 400);
    if (existingUser) return jsonError("Bu kullanıcı adı kullanımda", 400);
    if (pendingNumber) return jsonError("Bu mağaza numarası için bekleyen kayıt var", 400);
    if (pendingUser) return jsonError("Bu kullanıcı adı için bekleyen kayıt var", 400);

    const passwordHash = await bcrypt.hash(password, 12);
    const signup = await prisma.storeSignupRequest.create({
      data: {
        storeName,
        storeNumber,
        username,
        passwordHash,
        status: "PENDING",
      },
    });

    await notifyStaff({
      type: "SUPPORT",
      title: "Yeni mağaza kayıt talebi",
      body: `${storeName} (${storeNumber}) — ${username}`,
      linkUrl: "/admin/registrations",
    });

    return NextResponse.json(
      {
        id: signup.id,
        message: "Kayıt talebiniz alındı. Yönetici onayından sonra giriş yapabilirsiniz.",
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[auth/register]", e);
    return jsonError("Kayıt işlemi başarısız", 500);
  }
}
