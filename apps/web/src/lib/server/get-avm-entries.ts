import { prisma } from "@magaza/database";

export async function getAvmEntries(storeId?: string | null) {
  return prisma.avmEntry.findMany({
    where: storeId ? { storeId } : {},
    select: {
      id: true,
      subType: { select: { name: true, code: true } },
      vitrins: {
        orderBy: { siraNo: "asc" },
        select: {
          id: true,
          kind: true,
          siraNo: true,
          en: true,
          boy: true,
          camEn: true,
          camBoy: true,
          konum: true,
          gorselUrl: true,
        },
      },
      videos: {
        select: { id: true, adet: true, placement: { select: { name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}
