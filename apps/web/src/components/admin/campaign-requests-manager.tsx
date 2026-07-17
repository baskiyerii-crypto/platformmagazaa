"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { downloadExcelBlob } from "@/lib/download-excel";
import { fetchSlimStores } from "@/lib/stores-cache";
import {
  ADMIN_STATUS_TRANSITIONS,
  CHANGE_REQUEST_STATUS_LABELS,
  type ChangeRequestStatus,
  type PaginatedResponse,
} from "@magaza/shared";

type Campaign = { id: string; name: string };
type Store = { id: string; name: string };
type RequestItem = {
  id: string;
  store: Store;
  campaign?: Campaign | null;
  catalogItem: {
    name: string;
    code?: string;
    category?: { name: string } | null;
  };
  quantity?: number | null;
  status: ChangeRequestStatus;
  createdAt: string;
};

export function CampaignRequestsManager() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const map = new Map<string, { campaign: string; category: string; product: string; adet: number; stores: Set<string> }>();
    for (const item of items) {
      const key = `${item.campaign?.id}:${item.catalogItem.code ?? item.catalogItem.name}`;
      const row = map.get(key) ?? {
        campaign: item.campaign?.name ?? "",
        category: item.catalogItem.category?.name ?? "",
        product: item.catalogItem.name,
        adet: 0,
        stores: new Set<string>(),
      };
      row.adet += item.quantity ?? 0;
      row.stores.add(item.store.id);
      map.set(key, row);
    }
    return [...map.values()];
  }, [items]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ scope: "campaign", limit: "500" });
      if (campaignId) params.set("campaignId", campaignId);
      if (storeId) params.set("storeId", storeId);
      if (status) params.set("status", status);
      const res = await fetch(`/api/v1/catalog-requests?${params}`);
      const data: PaginatedResponse<RequestItem> = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error?: string }).error ?? "Talepler yüklenemedi");
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Talepler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/admin/catalog/campaigns?all=1").then((r) => r.json()),
      fetchSlimStores(),
    ]).then(([campaignData, storeData]) => {
      setCampaigns(Array.isArray(campaignData) ? campaignData : []);
      setStores(storeData);
    });
  }, []);

  useEffect(() => {
    void load();
  }, [campaignId, storeId, status]);

  async function updateStatus(id: string, next: ChangeRequestStatus) {
    const res = await fetch(`/api/v1/catalog-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Durum güncellenemedi");
      return;
    }
    await load();
  }

  async function downloadExcel() {
    setError("");
    const params = new URLSearchParams({ tab: "catalog", scope: "campaign", format: "excel" });
    if (campaignId) params.set("campaignId", campaignId);
    if (storeId) params.set("storeId", storeId);
    if (status) params.set("status", status);
    try {
      await downloadExcelBlob(
        `/api/v1/admin/export/requests?${params}`,
        `kampanya-talepleri-${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Excel indirilemedi");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <div>
          <h1 className="text-3xl font-bold">Kampanya Talepleri</h1>
          <p className="text-muted-foreground">Mağazaların kampanya ürün adetleri ve toplamları</p>
        </div>
        <Button onClick={downloadExcel}><Download className="mr-2 h-4 w-4" /> Kampanya Excel İndir</Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Kampanya</Label>
          <select className="flex h-10 w-full rounded-xl border px-3 text-sm" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            <option value="">Tümü</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Mağaza</Label>
          <select className="flex h-10 w-full rounded-xl border px-3 text-sm" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">Tümü</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Durum</Label>
          <select className="flex h-10 w-full rounded-xl border px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tümü</option>
            {Object.entries(CHANGE_REQUEST_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 font-semibold">Ürün Toplamları</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="py-2">Kampanya</th><th>Kategori</th><th>Ürün</th><th>Toplam Adet</th><th>Mağaza</th></tr></thead>
              <tbody>
                {totals.map((row) => (
                  <tr key={`${row.campaign}-${row.product}`} className="border-b last:border-0">
                    <td className="py-2">{row.campaign}</td><td>{row.category}</td><td>{row.product}</td>
                    <td className="font-medium">{row.adet}</td><td>{row.stores.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-col justify-between gap-3 p-4 lg:flex-row">
              <div>
                <div className="font-semibold">{item.store.name} · {item.catalogItem.name}</div>
                <div className="text-sm text-muted-foreground">
                  {item.campaign?.name} · {item.catalogItem.category?.name ?? "Kategori yok"} · {item.quantity ?? 0} adet
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.status} />
                {(ADMIN_STATUS_TRANSITIONS[item.status] ?? []).map((next) => (
                  <Button key={next} size="sm" variant="outline" onClick={() => updateStatus(item.id, next)}>
                    {CHANGE_REQUEST_STATUS_LABELS[next]}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && items.length === 0 && <p className="text-sm text-muted-foreground">Kampanya talebi yok.</p>}
      </div>
    </div>
  );
}
