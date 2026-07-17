import { NextResponse } from "next/server";
import { withAuth, jsonError } from "@/lib/api-auth";
import { generateAdExpensesExcelBuffer } from "@/lib/ad-expenses-excel";
import type { AdExpenseFilters } from "@/lib/ad-expenses";

export const GET = withAuth(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "excel";
    if (format !== "excel") {
      return jsonError("Şimdilik yalnızca format=excel desteklenir", 400);
    }

    const filters: AdExpenseFilters = {
      storeId: searchParams.get("storeId") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      announcementId: searchParams.get("announcementId") || undefined,
      catalogCampaignId: searchParams.get("catalogCampaignId") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      period: (searchParams.get("period") as AdExpenseFilters["period"]) || undefined,
      link: (searchParams.get("link") as AdExpenseFilters["link"]) || "all",
    };

    const buffer = await generateAdExpensesExcelBuffer(filters);
    const date = new Date().toISOString().slice(0, 10);
    const period = filters.period ?? "filtre";
    const type =
      filters.link === "campaign"
        ? "kampanya"
        : filters.link === "general"
          ? "ozel"
          : "tum";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="reklam-giderleri-${type}-${period}-${date}.xlsx"`,
      },
    });
  },
  { adminOnly: true }
);
