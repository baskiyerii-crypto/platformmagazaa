import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { isStaffRole } from "@magaza/shared";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async (_request, auth) => {
  const storeId = auth.role === "STORE" ? auth.storeId : undefined;

  const [storeCount, openRequests, vitrinCount, outdoorCount, signageCount] =
    await Promise.all([
      isStaffRole(auth.role)
        ? prisma.store.count({ where: { active: true } })
        : Promise.resolve(1),
      prisma.changeRequest.count({
        where: {
          ...(storeId ? { storeId } : {}),
          status: {
            notIn: ["MAGAZADA_GUNCELLENDI", "REDDEDILDI"],
          },
        },
      }),
      prisma.avmVitrin.count({
        where: storeId ? { avmEntry: { storeId } } : {},
      }),
      prisma.outdoorEntry.count({
        where: storeId ? { storeId } : {},
      }),
      prisma.storeSignageEntry.count({
        where: storeId ? { storeId } : {},
      }),
    ]);

  const recentRequests = await prisma.changeRequest.findMany({
    where: storeId ? { storeId } : {},
    include: { store: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  return NextResponse.json({
    storeCount,
    openRequests,
    vitrinCount,
    outdoorCount,
    signageCount,
    recentRequests,
  }, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
});
