import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { generateStoresExcelBuffer } from "@/lib/stores-excel";

export const GET = withAuth(
  async () => {
    const buffer = await generateStoresExcelBuffer();
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="magazalar-${date}.xlsx"`,
      },
    });
  },
  { adminOnly: true }
);
