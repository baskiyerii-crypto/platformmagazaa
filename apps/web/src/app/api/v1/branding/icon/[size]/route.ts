import { NextRequest, NextResponse } from "next/server";
import { getActiveAppLogo, getBrandingIconBuffer } from "@/lib/branding";

function parseSize(raw: string): 192 | 512 | 180 | null {
  if (raw === "apple-touch-icon") return 180;
  if (raw === "192") return 192;
  if (raw === "512") return 512;
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: raw } = await params;
  const size = parseSize(raw);
  if (!size) {
    return NextResponse.json({ error: "Geçersiz ikon boyutu" }, { status: 400 });
  }

  const logo = await getActiveAppLogo();
  const etag = logo ? `"logo-${logo.createdAt.getTime()}"` : '"logo-default"';
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  }

  const buffer = await getBrandingIconBuffer(size);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, must-revalidate",
      ETag: etag,
      ...(logo?.createdAt ? { "Last-Modified": logo.createdAt.toUTCString() } : {}),
    },
  });
}
