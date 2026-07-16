import { NextResponse } from "next/server";
import { withAuth, jsonError } from "@/lib/api-auth";
import { generateInventoryExcelBuffer } from "@/lib/inventory-excel";
import { generateInventoryPdfBuffer } from "@/lib/inventory-pdf";
import { fetchInventoryForExport } from "@/lib/server/inventory-export-data";
import { groupSizesWithTolerance, SIZE_TOLERANCE_CM } from "@/lib/size-groups";

export const GET = withAuth(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const filters = {
        storeId: searchParams.get("storeId") ?? undefined,
        type: searchParams.get("type") ?? undefined,
        search: searchParams.get("search") ?? undefined,
      };

      if (searchParams.get("summaryOnly") === "1") {
        const rows = await fetchInventoryForExport(filters);
        const groups = groupSizesWithTolerance(
          rows
            .map((r) => ({
              en: Number(r.en),
              boy: Number(r.boy),
              adet: Number(r.adet) || 1,
              konum: r.konum || null,
            }))
            .filter((r) => Number.isFinite(r.en) && Number.isFinite(r.boy) && r.en > 0 && r.boy > 0)
        );
        return NextResponse.json({
          toleranceCm: SIZE_TOLERANCE_CM,
          measureCount: groups.length,
          totalAdet: groups.reduce((s, g) => s + g.toplamAdet, 0),
          groups,
        });
      }

      const format = searchParams.get("format");
      if (format !== "excel" && format !== "pdf") {
        return jsonError("format=excel veya format=pdf gerekli", 400);
      }

      const date = new Date().toISOString().slice(0, 10);

      if (format === "excel") {
        const buffer = await generateInventoryExcelBuffer(filters);
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="envanter-${date}.xlsx"`,
            "Cache-Control": "no-store",
          },
        });
      }

      const buffer = await generateInventoryPdfBuffer(filters);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="envanter-${date}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (e) {
      console.error("[export/inventory]", e);
      return jsonError(
        e instanceof Error ? e.message : "Excel oluşturulamadı",
        500
      );
    }
  },
  { adminOnly: true }
);
