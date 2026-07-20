import { NextResponse } from "next/server";
import { prisma } from "@magaza/database";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async () => {
  const imageWhere = { gorselUrl: { not: null } };

  const [storesWithInventory, vitrinImages, outdoorImages, signageImages] = await Promise.all([
    prisma.store.count({
      where: {
        OR: [
          { avmEntries: { some: {} } },
          { outdoorEntries: { some: {} } },
          { signageEntries: { some: {} } },
        ],
      },
    }),
    prisma.avmVitrin.count({ where: imageWhere }),
    prisma.outdoorEntry.count({ where: imageWhere }),
    prisma.storeSignageEntry.count({ where: imageWhere }),
  ]);

  return NextResponse.json({
    storesWithInventory,
    totalImages: vitrinImages + outdoorImages + signageImages,
  });
}, { adminOnly: true });
