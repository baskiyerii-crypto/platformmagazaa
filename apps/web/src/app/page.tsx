import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { isStaffRole } from "@magaza/shared";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    redirect("/login");
  }

  if (!session) {
    redirect("/login");
  }

  if (isStaffRole(session.user.role)) {
    redirect("/admin");
  }

  redirect("/store");
}
