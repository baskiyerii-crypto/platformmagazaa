import { NextResponse } from "next/server";
import { getActiveAppLogo } from "@/lib/branding";

export async function GET() {
  const logo = await getActiveAppLogo();
  return NextResponse.json({
    logoUrl: logo?.url ?? null,
    updatedAt: logo?.createdAt ?? null,
  });
}
