import { redirect } from "next/navigation";
import { isStaffRole } from "@magaza/shared";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getDashboardData } from "@/lib/server/get-dashboard-data";
import { getSessionAuth } from "@/lib/server/session";

export default async function AdminPage() {
  const auth = await getSessionAuth();
  if (!auth || !isStaffRole(auth.role)) redirect("/login");

  const initialData = await getDashboardData(auth);

  return <AdminDashboard initialData={initialData} />;
}
