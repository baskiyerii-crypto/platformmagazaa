import { redirect } from "next/navigation";
import { StoreDashboard } from "@/components/store/store-dashboard";
import { getDashboardData } from "@/lib/server/get-dashboard-data";
import { getSessionAuth } from "@/lib/server/session";

export default async function StorePage() {
  const auth = await getSessionAuth();
  if (!auth || auth.role !== "STORE") redirect("/login");

  const initialData = await getDashboardData(auth);

  return <StoreDashboard initialData={initialData} />;
}
