import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { buildIosInstallLink } from "@/lib/mobile-install-token";
import { getMobileReleaseInfo } from "@/lib/mobile-releases";

export const GET = withAuth(
  async () => {
    const [android, ios] = await Promise.all([
      getMobileReleaseInfo("ANDROID"),
      getMobileReleaseInfo("IOS"),
    ]);

    return NextResponse.json({
      android,
      ios: ios
        ? {
            ...ios,
            installLink: buildIosInstallLink(),
          }
        : null,
    });
  },
  { adminOnly: true }
);
