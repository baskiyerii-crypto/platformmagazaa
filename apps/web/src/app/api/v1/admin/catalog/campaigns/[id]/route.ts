import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuthParams, jsonError } from "@/lib/api-auth";
import { updateCatalogCampaignSchema } from "@magaza/shared";
import { isCampaignOpenForRequests, normalizeCampaignDates } from "@/lib/catalog-campaign";

export const GET = withAuthParams<{ id: string }>(
  async (_request, _auth, context) => {
    const { id } = await context.params;
    const campaign = await prisma.catalogCampaign.findUnique({
      where: { id },
      include: {
        categories: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
        items: {
          include: { category: { select: { id: true, name: true } } },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
        _count: { select: { items: true, requests: true } },
      },
    });
    if (!campaign) return jsonError("Kampanya bulunamadı", 404);
    return NextResponse.json({
      ...campaign,
      openForRequests: isCampaignOpenForRequests(campaign),
    });
  },
  { adminOnly: true }
);

export const PATCH = withAuthParams<{ id: string }>(
  async (request, _auth, context) => {
    const { id } = await context.params;
    const existing = await prisma.catalogCampaign.findUnique({ where: { id } });
    if (!existing) return jsonError("Kampanya bulunamadı", 404);

    const body = await request.json();
    const parsed = updateCatalogCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    const mode = parsed.data.mode ?? existing.mode;
    const dates = normalizeCampaignDates({
      mode,
      startsAt: parsed.data.startsAt !== undefined ? parsed.data.startsAt : existing.startsAt,
      endsAt: parsed.data.endsAt !== undefined ? parsed.data.endsAt : existing.endsAt,
    });

    if (dates.mode === "PERIODIC" && (!dates.startsAt || !dates.endsAt)) {
      return jsonError("Dönemlik kampanya için başlangıç ve bitiş tarihi gerekli", 400);
    }
    if (dates.startsAt && dates.endsAt && dates.endsAt < dates.startsAt) {
      return jsonError("Bitiş tarihi başlangıçtan önce olamaz", 400);
    }

    const campaign = await prisma.catalogCampaign.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description }
          : {}),
        mode: dates.mode,
        startsAt: dates.startsAt,
        endsAt: dates.endsAt,
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      },
      include: {
        categories: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
        items: true,
        _count: { select: { items: true, requests: true } },
      },
    });

    return NextResponse.json({
      ...campaign,
      openForRequests: isCampaignOpenForRequests(campaign),
    });
  },
  { strictAdminOnly: true }
);

export const DELETE = withAuthParams<{ id: string }>(
  async (_request, _auth, context) => {
    const { id } = await context.params;
    const existing = await prisma.catalogCampaign.findUnique({ where: { id } });
    if (!existing) return jsonError("Kampanya bulunamadı", 404);

    await prisma.catalogCampaign.update({
      where: { id },
      data: { active: false },
    });
    return NextResponse.json({ success: true });
  },
  { strictAdminOnly: true }
);
