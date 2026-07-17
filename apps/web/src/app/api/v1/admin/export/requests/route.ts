import { NextResponse } from "next/server";
import { withAuth, jsonError } from "@/lib/api-auth";
import {
  fetchRequestSizeSummary,
  generateRequestsExcelBuffer,
} from "@/lib/requests-excel";
import { SIZE_TOLERANCE_CM } from "@/lib/size-groups";

export const GET = withAuth(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const filters = {
      status: searchParams.get("status") ?? undefined,
      storeId: searchParams.get("storeId") ?? undefined,
      targetType: searchParams.get("targetType") ?? undefined,
      campaignId: searchParams.get("campaignId") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      scope: (searchParams.get("scope") as "product" | "campaign" | null) ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      tab: searchParams.get("tab") ?? "all",
    };

    if (searchParams.get("summaryOnly") === "1") {
      const groups = await fetchRequestSizeSummary(filters);
      return NextResponse.json({
        toleranceCm: SIZE_TOLERANCE_CM,
        measureCount: groups.length,
        totalAdet: groups.reduce((s, g) => s + g.toplamAdet, 0),
        groups,
      });
    }

    const format = searchParams.get("format") ?? "excel";
    if (format !== "excel") {
      return jsonError("Şimdilik yalnızca format=excel desteklenir", 400);
    }

    const buffer = await generateRequestsExcelBuffer(filters);
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="talepler-${date}.xlsx"`,
      },
    });
  },
  { adminOnly: true }
);
