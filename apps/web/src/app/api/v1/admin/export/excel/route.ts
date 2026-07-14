import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { generateExcelBuffer } from "@/lib/excel";

export const GET = withAuth(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId") ?? undefined;

    const buffer = await generateExcelBuffer(storeId);
    const filename = storeId
      ? `magaza-export-${storeId}.xlsx`
      : `magaza-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  },
  { adminOnly: true }
);
