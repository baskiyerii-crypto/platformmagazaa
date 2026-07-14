import { StoreDetail } from "@/components/admin/store-detail";

export default async function AdminStoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StoreDetail storeId={id} />;
}
