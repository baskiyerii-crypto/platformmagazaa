import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, withAuthParams, jsonError } from "@/lib/api-auth";
import { updateStoreSchema, createStoreUserSchema } from "@magaza/shared";
import bcrypt from "bcryptjs";

export const GET = withAuthParams<{ id: string }>(
  async (request, _auth, context) => {
    const { id } = await context.params;
    const full = new URL(request.url).searchParams.get("full") === "1";

    const store = await prisma.store.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        address: true,
        active: true,
        users: { select: { id: true, username: true, role: true, createdAt: true } },
        _count: {
          select: { avmEntries: true, outdoorEntries: true, changeRequests: true },
        },
        ...(full
          ? {
              avmEntries: {
                take: 30,
                orderBy: { updatedAt: "desc" as const },
                include: {
                  subType: { select: { name: true, code: true } },
                  vitrins: {
                    take: 10,
                    orderBy: { siraNo: "asc" as const },
                    select: { id: true, siraNo: true, en: true, boy: true, camEn: true, camBoy: true, gorselUrl: true },
                  },
                  videos: { take: 5, include: { placement: { select: { name: true } } } },
                },
              },
              outdoorEntries: {
                take: 30,
                orderBy: { updatedAt: "desc" as const },
                include: { subType: { select: { name: true } } },
              },
              changeRequests: {
                take: 20,
                orderBy: { createdAt: "desc" as const },
                select: { id: true, status: true, targetType: true, createdAt: true },
              },
            }
          : {}),
      },
    });

    if (!store) return jsonError("Mağaza bulunamadı", 404);
    return NextResponse.json(store, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  },
  { adminOnly: true }
);

export const PATCH = withAuthParams<{ id: string }>(
  async (request, _auth, context) => {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateStoreSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    const store = await prisma.store.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(store);
  },
  { adminOnly: true }
);

export const DELETE = withAuthParams<{ id: string }>(
  async (_request, _auth, context) => {
    const { id } = await context.params;
    await prisma.store.delete({ where: { id } });
    return NextResponse.json({ success: true });
  },
  { adminOnly: true }
);

export const POST = withAuthParams<{ id: string }>(
  async (request, _auth, context) => {
    const { id: storeId } = await context.params;
    const body = await request.json();
    const parsed = createStoreUserSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    const existing = await prisma.user.findUnique({
      where: { username: parsed.data.username },
    });
    if (existing) return jsonError("Kullanıcı adı kullanımda", 400);

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: {
        username: parsed.data.username,
        passwordHash,
        role: "STORE",
        storeId,
      },
    });

    return NextResponse.json(
      { id: user.id, username: user.username },
      { status: 201 }
    );
  },
  { adminOnly: true }
);
