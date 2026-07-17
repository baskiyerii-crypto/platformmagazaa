import { NextResponse } from "next/server";
import { getBrandingLogoStatus } from "@/lib/branding";

export async function GET() {
  const status = await getBrandingLogoStatus();
  return NextResponse.json(status);
}
