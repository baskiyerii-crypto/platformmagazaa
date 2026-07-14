import { redirect } from "next/navigation";
import { AvmManager } from "@/components/store/avm-manager";
import { getAvmEntries } from "@/lib/server/get-avm-entries";
import { getDefinitions } from "@/lib/server/get-definitions";
import { getSessionAuth } from "@/lib/server/session";

export default async function StoreAvmPage() {
  const auth = await getSessionAuth();
  if (!auth || auth.role !== "STORE") redirect("/login");

  const [initialDefinitions, initialEntries] = await Promise.all([
    getDefinitions(),
    getAvmEntries(auth.storeId),
  ]);

  return (
    <AvmManager
      initialDefinitions={initialDefinitions}
      initialEntries={initialEntries}
    />
  );
}
