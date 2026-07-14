import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { RoleProvider } from "@/lib/role-context";
import { getSessionAuth } from "@/lib/server/session";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const auth = await getSessionAuth();
  if (!auth || auth.role !== "STORE") redirect("/login");

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
