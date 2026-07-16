import { NextResponse } from "next/server";
import { withAuth, jsonError } from "@/lib/api-auth";
import { importStoresFromExcelBuffer } from "@/lib/stores-import-excel";

export const POST = withAuth(
  async (request) => {
    try {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return jsonError("Excel dosyası gerekli", 400);
      }

      const name = file.name.toLowerCase();
      if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
        return jsonError("Sadece .xlsx dosyaları desteklenir", 400);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await importStoresFromExcelBuffer(buffer);
      return NextResponse.json(result);
    } catch (e) {
      console.error("[stores/import]", e);
      return jsonError(e instanceof Error ? e.message : "İçe aktarma başarısız", 500);
    }
  },
  { strictAdminOnly: true }
);
