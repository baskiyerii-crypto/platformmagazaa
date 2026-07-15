import { NextResponse } from "next/server";
import { withAuth, jsonError } from "@/lib/api-auth";
import { generateSupportTicketsExcelBuffer } from "@/lib/support-excel";

export const GET = withAuth(
  async (request) => {
    const { searchParams } = new URL(request.url);
    try {
      const buffer = await generateSupportTicketsExcelBuffer({
        storeId: searchParams.get("storeId") || undefined,
        tab: searchParams.get("tab") || undefined,
      });
      const body = new Uint8Array(buffer);
      const date = new Date().toISOString().slice(0, 10);
      const tab = searchParams.get("tab") || "tum";
      return new NextResponse(body, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="destek-talepleri-${tab}-${date}.xlsx"`,
          "Content-Length": String(body.byteLength),
          "Cache-Control": "no-store",
        },
      });
    } catch (e) {
      console.error("[export/support-tickets]", e);
      return jsonError(
        e instanceof Error ? e.message : "Excel oluşturulamadı",
        500
      );
    }
  },
  { adminOnly: true }
);
