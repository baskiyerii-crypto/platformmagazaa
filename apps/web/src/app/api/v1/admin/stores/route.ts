import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import { createStoreSchema } from "@magaza/shared";
import bcrypt from "bcryptjs";

export const GET = withAuth(
  async (request) => {
    const slim = new URL(request.url).searchParams.get("slim") === "1";

    if (slim) {
      const stores = await prisma.store.findMany({
        select: { id: true, name: true, storeNumber: true },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(stores);
    }

    const stores = await prisma.store.findMany({
      include: {
        users: { select: { id: true, username: true, role: true, createdAt: true } },
        _count: {
          select: {
            avmEntries: true,
            outdoorEntries: true,
            changeRequests: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(stores);
  },
  { adminOnly: true }
);

export const POST = withAuth(
  async (request) => {
    const body = await request.json();
    const parsed = createStoreSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    const { name, storeNumber, address, active, username, password } = parsed.data;

    const existingNumber = await prisma.store.findUnique({ where: { storeNumber } });
    if (existingNumber) return jsonError("Mağaza numarası kullanımda", 400);

    if (username && password) {
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) return jsonError("Kullanıcı adı kullanımda", 400);

      const passwordHash = await bcrypt.hash(password, 12);
      const store = await prisma.$transaction(async (tx) => {
        const created = await tx.store.create({
          data: { name, storeNumber, address, active },
        });
        await tx.user.create({
          data: {
            username,
            passwordHash,
            role: "STORE",
            storeId: created.id,
          },
        });
        return created;
      });

      return NextResponse.json(store, { status: 201 });
    }

    const store = await prisma.store.create({
      data: { name, storeNumber, address, active },
    });
    return NextResponse.json(store, { status: 201 });
  },
  { strictAdminOnly: true }
);
