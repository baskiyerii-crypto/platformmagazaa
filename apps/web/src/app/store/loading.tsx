import { SkeletonGrid, StatGrid } from "@/components/page-header";

export default function StoreLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-muted" />
      </div>
      <StatGrid count={3} />
      <SkeletonGrid count={4} />
    </div>
  );
}
