"use client";

import Link from "next/link";
import { Building2, ClipboardList, ImageIcon, Trees } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { queryKeys } from "@/lib/query-keys";
import type { ChangeRequestStatus } from "@magaza/shared";

type DashboardData = {
  openRequests: number;
  vitrinCount: number;
  outdoorCount: number;
  signageCount: number;
  recentRequests: Array<{ id: string; status: ChangeRequestStatus }>;
};

type Props = {
  initialData?: DashboardData;
};

export function StoreDashboard({ initialData }: Props) {
  const { data } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => fetch("/api/v1/dashboard").then((r) => r.json()) as Promise<DashboardData>,
    initialData,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Mağaza Paneli</h1>
        <p className="text-muted-foreground">Envanter ve talep özeti</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Vitrinler</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data?.vitrinCount ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Açık Hava</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data?.outdoorCount ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Mağaza İçi</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data?.signageCount ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Açık Talepler</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data?.openRequests ?? 0}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Button asChild className="h-auto flex-col gap-2 py-6">
          <Link href="/store/avm"><Building2 className="h-6 w-6" /> AVM Alanları</Link>
        </Button>
        <Button asChild variant="secondary" className="h-auto flex-col gap-2 py-6">
          <Link href="/store/outdoor"><Trees className="h-6 w-6" /> Açık Hava</Link>
        </Button>
        <Button asChild variant="secondary" className="h-auto flex-col gap-2 py-6">
          <Link href="/store/signage"><ImageIcon className="h-6 w-6" /> Mağaza İçi Reklamlar</Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-2 py-6">
          <Link href="/store/requests"><ClipboardList className="h-6 w-6" /> Taleplerim</Link>
        </Button>
      </div>

      {data?.recentRequests?.length ? (
        <Card>
          <CardHeader><CardTitle>Son Talepler</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.recentRequests.map((r) => (
              <div key={r.id} className="flex justify-between rounded-xl border p-3">
                <span className="text-sm">Talep #{r.id.slice(0, 8)}</span>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
