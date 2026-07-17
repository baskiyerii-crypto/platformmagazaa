import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/vapid";

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: "Web Push yapılandırması eksik (VAPID_PUBLIC_KEY)" },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey });
}
