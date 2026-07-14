import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { isStaffRole } from "@magaza/shared";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (isStaffRole(session.user.role)) {
    redirect("/admin");
  }

  redirect("/store");
}
