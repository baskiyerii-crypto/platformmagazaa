import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";

function inventoryTotalHint(total: number) {
  if (total > 0) return null;
  return "DB bağlı ama envanter kaydı 0 — Excel boş gelir. Veri başka DB'deyse DATABASE_URL kontrol edin.";
}

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

    const [stores, avmVitrins, outdoors, signages] = await Promise.all([
      prisma.store.count(),
      prisma.avmVitrin.count(),
      prisma.outdoorEntry.count(),
      prisma.storeSignageEntry.count(),
    ]);

    return NextResponse.json({
      ok: !schemaError,
      users,
      stores,
      inventory: {
        avmVitrins,
        outdoors,
        signages,
        total: avmVitrins + outdoors + signages,
      },
      adExpenseCategories,
      announcementKindOk,
      schemaError,
      hint: schemaError
        ? "Coolify redeploy (docker entrypoint prisma db push) veya: pnpm --filter @magaza/database push"
        : inventoryTotalHint(avmVitrins + outdoors + signages),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "DB hatasi" },
      { status: 500 }
    );
  }
}
