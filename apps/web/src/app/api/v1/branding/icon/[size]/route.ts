import { NextRequest, NextResponse } from "next/server";
import { getActiveAppLogo, getBrandingIconBuffer } from "@/lib/branding";

function parseSize(raw: string): 192 | 512 | 180 | 96 | 48 | null {
  if (raw === "apple-touch-icon") return 180;
  if (raw === "512") return 512;
  if (raw === "192") return 192;
  if (raw === "180") return 180;
  if (raw === "96") return 96;
  if (raw === "48") return 48;
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

  let etag = '"logo-default"';
  let lastModified: string | undefined;
  try {
    const logo = await getActiveAppLogo();
    if (logo) {
      etag = `"logo-${logo.createdAt.getTime()}"`;
      lastModified = logo.createdAt.toUTCString();
    }
  } catch {
    /* use default etag */
  }

  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        // Cacheable — Chrome/Windows need this for PWA shortcut icons
        "Cache-Control": "public, max-age=3600, must-revalidate",
      },
    });
  }

  const buffer = await getBrandingIconBuffer(size);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, must-revalidate",
      ETag: etag,
      ...(lastModified ? { "Last-Modified": lastModified } : {}),
    },
  });
}
