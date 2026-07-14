import { NextResponse } from "next/server";
import { withAuth, jsonError } from "@/lib/api-auth";
import { generateInventoryExcelBuffer } from "@/lib/inventory-excel";
import { generateInventoryPdfBuffer } from "@/lib/inventory-pdf";

export const GET = withAuth(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");
    if (format !== "excel" && format !== "pdf") {
      return jsonError("format=excel veya format=pdf gerekli", 400);
    }

    const filters = {
      storeId: searchParams.get("storeId") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    };

    const date = new Date().toISOString().slice(0, 10);

    if (format === "excel") {
      const buffer = await generateInventoryExcelBuffer(filters);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="envanter-${date}.xlsx"`,
        },
      });
    }

    const buffer = await generateInventoryPdfBuffer(filters);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="envanter-${date}.pdf"`,
      },
    });
  },
  { adminOnly: true }
);
