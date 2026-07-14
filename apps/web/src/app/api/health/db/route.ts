import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";

export async function GET() {
  try {
    const count = await prisma.user.count();
    return NextResponse.json({ ok: true, users: count });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "DB hatasi" },
      { status: 500 }
    );
  }
}
