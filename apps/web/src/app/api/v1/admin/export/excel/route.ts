import { NextResponse } from "next/server";
import { withAuth, jsonError } from "@/lib/api-auth";
import { generateExcelBuffer } from "@/lib/excel";

export const GET = withAuth(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId") ?? undefined;

    try {
      const buffer = await generateExcelBuffer(storeId);
      const filename = storeId
        ? `magaza-export-${storeId}.xlsx`
        : `magaza-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      const body = new Uint8Array(buffer);

      return new NextResponse(body, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(body.byteLength),
          "Cache-Control": "no-store",
        },
      });
    } catch (e) {
      console.error("[export/excel]", e);
      return jsonError(
        e instanceof Error ? e.message : "Excel oluşturulamadı",
        500
      );
    }
  },
  { adminOnly: true }
);
