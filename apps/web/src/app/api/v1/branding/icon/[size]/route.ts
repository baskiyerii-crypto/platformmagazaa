import { NextResponse } from "next/server";
import { getBrandingIconBuffer } from "@/lib/branding";

const SIZE_MAP = {
  "192": 192,
  "512": 512,
  "apple-touch-icon": 180,
} as const;

type SizeKey = keyof typeof SIZE_MAP;

export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> }
) {
  const { size } = await context.params;
  const px = SIZE_MAP[size as SizeKey];
  if (!px) {
    return NextResponse.json({ error: "Geçersiz ikon boyutu" }, { status: 400 });
  }

  const buffer = await getBrandingIconBuffer(px as 192 | 512 | 180);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300",
    },
  });
}
