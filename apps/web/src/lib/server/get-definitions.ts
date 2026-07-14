import { prisma } from "@magaza/database";

export async function getDefinitions() {
  const [categories, placements] = await Promise.all([
    prisma.areaCategory.findMany({
      include: { subTypes: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.placementOption.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return { categories, placements };
}
