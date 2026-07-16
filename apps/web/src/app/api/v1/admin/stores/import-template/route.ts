import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { generateStoreImportTemplateBuffer } from "@/lib/stores-import-excel";

export const GET = withAuth(
  async () => {
    const buffer = await generateStoreImportTemplateBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="magaza-toplu-sablon.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  },
  { strictAdminOnly: true }
);
