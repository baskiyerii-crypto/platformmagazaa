import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { UserRole } from "@magaza/shared";

export type ServerAuth = {
  userId: string;
  username: string;
  role: UserRole;
  storeId?: string | null;
  storeName?: string | null;
};

export async function getSessionAuth(): Promise<ServerAuth | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    username: session.user.username,
    role: session.user.role,
    storeId: session.user.storeId,
    storeName: session.user.storeName,
  };
}
