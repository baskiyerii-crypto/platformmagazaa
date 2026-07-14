import { prisma } from "@magaza/database";
import { isStaffRole } from "@magaza/shared";
import type { ServerAuth } from "./session";

export async function getDashboardData(auth: ServerAuth) {
  const storeId = auth.role === "STORE" ? auth.storeId : undefined;

  const [storeCount, openRequests, vitrinCount, outdoorCount, signageCount, recentRequests] =
    await Promise.all([
      isStaffRole(auth.role)
        ? prisma.store.count({ where: { active: true } })
        : Promise.resolve(1),
      prisma.changeRequest.count({
        where: {
          ...(storeId ? { storeId } : {}),
          status: { notIn: ["MAGAZADA_GUNCELLENDI", "REDDEDILDI"] },
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
      prisma.changeRequest.findMany({
        where: storeId ? { storeId } : {},
        include: { store: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

  return {
    storeCount,
    openRequests,
    vitrinCount,
    outdoorCount,
    signageCount,
    recentRequests: recentRequests.map((r) => ({
      id: r.id,
      status: r.status,
      updatedAt: r.updatedAt.toISOString(),
      store: r.store,
    })),
  };
}
