import { prisma } from "@magaza/database";

export async function validateSignageSubType(subTypeId: string) {
  const subType = await prisma.areaSubType.findFirst({
    where: { id: subTypeId, category: { type: "MAGAZA_ICI" } },
  });
  return subType;
}

export async function validatePlacement(placementId: string) {
  return prisma.placementOption.findUnique({ where: { id: placementId } });
}
