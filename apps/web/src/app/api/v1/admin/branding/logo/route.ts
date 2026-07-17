import { NextResponse } from "next/server";
import { getBrandingLogoStatus, saveAppLogo } from "@/lib/branding";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(
  async () => {
    const status = await getBrandingLogoStatus();
    return NextResponse.json(status);
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
      await saveAppLogo(file, auth.userId);
      const status = await getBrandingLogoStatus();
      return NextResponse.json({ success: true, ...status });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Logo yüklenemedi" },
        { status: 400 }
      );
    }
  },
  { strictAdminOnly: true }
);
