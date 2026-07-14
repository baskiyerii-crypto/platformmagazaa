import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { updateAnnouncementSchema } from "@magaza/shared";

export const PATCH = withAuthParams<{ id: string }>(
  async (request, _auth, context) => {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateAnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...parsed.data,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      },
    });
    return NextResponse.json(announcement);
  },
  { strictAdminOnly: true }
);

export const DELETE = withAuthParams<{ id: string }>(
  async (_request, _auth, context) => {
    const { id } = await context.params;
    await prisma.announcement.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ success: true });
  },
  { strictAdminOnly: true }
);
