import { redirect } from "next/navigation";
import { isStaffRole } from "@magaza/shared";
import { InventoryManager } from "@/components/admin/inventory-manager";
import { getInventoryPage, getSlimStores } from "@/lib/server/get-inventory-page";
import { getSessionAuth } from "@/lib/server/session";

export default async function AdminInventoryPage() {
  const auth = await getSessionAuth();
  if (!auth || !isStaffRole(auth.role)) redirect("/login");

  const [initialInventory, initialStores] = await Promise.all([
    getInventoryPage({ page: 1, limit: 24 }),
    getSlimStores(),
  ]);

  return (
    <InventoryManager
      initialInventory={initialInventory}
      initialStores={initialStores}
    />
  );
}
