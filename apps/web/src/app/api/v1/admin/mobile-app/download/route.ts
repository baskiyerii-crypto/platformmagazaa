import { NextRequest, NextResponse } from "next/server";
import { withAuth, jsonError } from "@/lib/api-auth";
import {
  getMobileReleaseInfo,
  getMobileReleaseMime,
  readMobileReleaseFile,
  type MobilePlatform,
} from "@/lib/mobile-releases";

export const GET = withAuth(
  async (request: NextRequest) => {
    const platform = request.nextUrl.searchParams.get("platform")?.toUpperCase() as MobilePlatform | undefined;
    if (platform !== "ANDROID" && platform !== "IOS") {
      return jsonError("platform=ANDROID veya platform=IOS gerekli", 400);
    }

    try {
      const info = await getMobileReleaseInfo(platform);
      if (!info) {
        return jsonError(`${platform === "ANDROID" ? "APK" : "IPA"} dosyası henüz hazır değil`, 404);
      }

      const buffer = await readMobileReleaseFile(platform);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": getMobileReleaseMime(platform),
          "Content-Disposition": `attachment; filename="${encodeURIComponent(info.fileName)}"`,
          "Content-Length": String(buffer.length),
        },
      });
    } catch {
      return jsonError("Dosya indirilemedi", 404);
    }
  },
  { adminOnly: true }
);
