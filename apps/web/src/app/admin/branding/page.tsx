import { redirect } from "next/navigation";
import { BrandingManager } from "@/components/admin/branding-manager";
import { getSessionAuth } from "@/lib/server/session";

export default async function AdminBrandingPage() {
  const auth = await getSessionAuth();
  if (!auth || auth.role !== "ADMIN") redirect("/admin");
  return <BrandingManager />;
}
