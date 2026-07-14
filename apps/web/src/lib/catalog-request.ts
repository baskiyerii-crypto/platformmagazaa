import { ChangeRequestStatus } from "@magaza/database";
import { canTransitionStatus } from "@magaza/shared";

export function validateCatalogStatusTransition(
  current: ChangeRequestStatus,
  next: ChangeRequestStatus
): string | null {
  if (current === next) return "Durum zaten aynı";
  if (!canTransitionStatus(current, next)) {
    return `Durum ${current} iken ${next} yapılamaz`;
  }
  return null;
}

export async function createCatalogStatusHistory(
  prisma: {
    catalogRequestHistory: {
      create: (args: {
        data: {
          catalogRequestId: string;
          fromStatus: ChangeRequestStatus | null;
          toStatus: ChangeRequestStatus;
          userId?: string;
          note?: string | null;
        };
      }) => Promise<unknown>;
    };
  },
  catalogRequestId: string,
  fromStatus: ChangeRequestStatus | null,
  toStatus: ChangeRequestStatus,
  userId?: string,
  note?: string | null
) {
  return prisma.catalogRequestHistory.create({
    data: {
      catalogRequestId,
      fromStatus,
      toStatus,
      userId,
      note,
    },
  });
}
