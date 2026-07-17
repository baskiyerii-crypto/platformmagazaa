import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth, jsonError } from "@/lib/api-auth";
import { createCatalogCampaignSchema, isStaffRole } from "@magaza/shared";
import { isCampaignOpenForRequests, normalizeCampaignDates } from "@/lib/catalog-campaign";

export const GET = withAuth(async (request, auth) => {
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("all") === "1" && isStaffRole(auth.role as "ADMIN" | "MANAGER" | "STORE");
  const now = new Date();

  const campaigns = await prisma.catalogCampaign.findMany({
    where: includeInactive ? undefined : { active: true },
    include: {
      categories: {
        where: includeInactive ? undefined : { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
      items: {
        where: includeInactive ? undefined : { active: true },
        include: {
          category: { select: { id: true, name: true, sortOrder: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
      _count: { select: { items: true, requests: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const payload = campaigns.map((c) => ({
    ...c,
    openForRequests: isCampaignOpenForRequests(c, now),
  }));

  return NextResponse.json(payload);
});

export const POST = withAuth(
  async (request) => {
    const body = await request.json();
    const parsed = createCatalogCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Geçersiz veri", 400);
    }

    const dates = normalizeCampaignDates(parsed.data);
    if (dates.mode === "PERIODIC" && (!dates.startsAt || !dates.endsAt)) {
      return jsonError("Dönemlik kampanya için başlangıç ve bitiş tarihi gerekli", 400);
    }
    if (dates.startsAt && dates.endsAt && dates.endsAt < dates.startsAt) {
      return jsonError("Bitiş tarihi başlangıçtan önce olamaz", 400);
    }

    const campaign = await prisma.catalogCampaign.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        mode: dates.mode,
        startsAt: dates.startsAt,
        endsAt: dates.endsAt,
        active: parsed.data.active ?? true,
        sortOrder: parsed.data.sortOrder ?? 0,
      },
      include: {
        categories: true,
        items: true,
        _count: { select: { items: true, requests: true } },
      },
    });

    return NextResponse.json(
      { ...campaign, openForRequests: isCampaignOpenForRequests(campaign) },
      { status: 201 }
    );
  },
  { strictAdminOnly: true }
);
