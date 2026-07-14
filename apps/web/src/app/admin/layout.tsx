import { redirect } from "next/navigation";
import { isStaffRole } from "@magaza/shared";
import { DashboardLayout } from "@/components/dashboard-layout";
import { RoleProvider } from "@/lib/role-context";
import { getSessionAuth } from "@/lib/server/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await getSessionAuth();
  if (!auth || !isStaffRole(auth.role)) redirect("/login");

  return (
    <RoleProvider role={auth.role}>
      <DashboardLayout
        role={auth.role}
        displayName={auth.storeName ?? auth.username}
      >
        {children}
      </DashboardLayout>
    </RoleProvider>
  );
}
