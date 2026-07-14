"use client";

import { Building2, ClipboardList, Store, Trees } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";
import { PageHeader, StatGrid, Skeleton } from "@/components/page-header";
import { queryKeys } from "@/lib/query-keys";
import type { ChangeRequestStatus } from "@magaza/shared";

type DashboardData = {
  storeCount: number;
  openRequests: number;
  vitrinCount: number;
  outdoorCount: number;
  recentRequests: Array<{
    id: string;
    status: ChangeRequestStatus;
    updatedAt: string;
    store: { name: string };
  }>;
};

type Props = {
  initialData?: DashboardData;
};

export function AdminDashboard({ initialData }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => fetch("/api/v1/dashboard").then((r) => r.json()) as Promise<DashboardData>,
    initialData,
    staleTime: 30_000,
  });
  const loading = isLoading && !data;

  const stats = [
    { label: "Aktif Mağaza", value: data?.storeCount ?? 0, icon: Store },
    { label: "Açık Talepler", value: data?.openRequests ?? 0, icon: ClipboardList },
    { label: "Toplam Vitrin", value: data?.vitrinCount ?? 0, icon: Building2 },
    { label: "Açık Hava", value: data?.outdoorCount ?? 0, icon: Trees },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Envanter ve talep özeti" />

      {loading ? (
        <StatGrid />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="stat-card">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-2 text-3xl font-semibold tabular-nums">{stat.value}</div>
              </div>
            );
          })}
        </div>
      )}

      <section className="panel-section">
        <h2 className="mb-4 font-semibold">Son Talepler</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : data?.recentRequests?.length ? (
          <div className="divide-y rounded-lg border">
            {data.recentRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{req.store.name}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(req.updatedAt)}</div>
                </div>
                <StatusBadge status={req.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Henüz talep yok</p>
        )}
      </section>
    </div>
  );
}
