import { ChangeRequestStatus } from "@magaza/database";
import {
  canManagerApproveTransition,
  canTransitionStatus,
  isStaffRole,
  type UserRole,
} from "@magaza/shared";

export function validateStatusTransition(
  current: ChangeRequestStatus,
  next: ChangeRequestStatus,
  role: UserRole
): string | null {
  if (current === next) return "Durum zaten aynı";

  if (canManagerApproveTransition(current, next)) {
    if (!isStaffRole(role)) {
      return "Bu onay işlemi için müdür veya yönetici yetkisi gerekli";
    }
    return null;
  }

  if (!canTransitionStatus(current, next)) {
    return `Durum ${current} iken ${next} yapılamaz`;
  }

  if (!isStaffRole(role)) {
    return "Sadece yönetici veya müdür durum güncelleyebilir";
  }

  return null;
}

export async function createStatusHistory(
  prisma: {
    changeRequestHistory: {
      create: (args: {
        data: {
          changeRequestId: string;
          fromStatus: ChangeRequestStatus | null;
          toStatus: ChangeRequestStatus;
          userId?: string;
          note?: string | null;
        };
      }) => Promise<unknown>;
    };
  },
  changeRequestId: string,
  fromStatus: ChangeRequestStatus | null,
  toStatus: ChangeRequestStatus,
  userId?: string,
  note?: string | null
) {
  return prisma.changeRequestHistory.create({
    data: {
      changeRequestId,
      fromStatus,
      toStatus,
      userId,
      note,
    },
  });
}
