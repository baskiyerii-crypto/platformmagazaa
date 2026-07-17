import { NextResponse } from "next/server";
import { getActiveAppLogo, saveAppLogo } from "@/lib/branding";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(
  async () => {
    const logo = await getActiveAppLogo();
    return NextResponse.json({
      logoUrl: logo?.url ?? null,
      updatedAt: logo?.createdAt ?? null,
    });
  },
  { strictAdminOnly: true }
);

export const POST = withAuth(
  async (request, auth) => {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
    }

    try {
      const logoUrl = await saveAppLogo(file, auth.userId);
      return NextResponse.json({ success: true, logoUrl });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Logo yüklenemedi" },
        { status: 400 }
      );
    }
  },
  { strictAdminOnly: true }
);
