import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";

export async function GET() {
  try {
    const users = await prisma.user.count();
    let adExpenseCategories: number | null = null;
    let announcementKindOk = false;
    let schemaError: string | null = null;

    try {
      adExpenseCategories = await prisma.adExpenseCategory.count();
      await prisma.announcement.findFirst({
        where: { kind: "NORMAL" },
        select: { id: true },
      });
      announcementKindOk = true;
    } catch (e) {
      schemaError = e instanceof Error ? e.message : "şema hatası";
    }

    return NextResponse.json({
      ok: !schemaError,
      users,
      adExpenseCategories,
      announcementKindOk,
      schemaError,
      hint: schemaError
        ? "Coolify redeploy (docker entrypoint prisma db push) veya: pnpm --filter @magaza/database push"
        : null,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "DB hatasi" },
      { status: 500 }
    );
  }
}
