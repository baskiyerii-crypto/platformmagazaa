"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import {
  CATALOG_CAMPAIGN_MODE_LABELS,
  type CatalogCampaignMode,
  type ChangeRequestStatus,
} from "@magaza/shared";

type CatalogItem = {
  id: string;
  name: string;
  description?: string | null;
  referenceImageUrl?: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
};

type Category = { id: string; name: string };

type Campaign = {
  id: string;
  name: string;
  description?: string | null;
  mode: CatalogCampaignMode;
  openForRequests?: boolean;
  categories: Category[];
  items: CatalogItem[];
};

type CatalogRequest = {
  id: string;
  quantity?: number | null;
  status: ChangeRequestStatus;
  campaign?: { id: string; name: string } | null;
  catalogItem: { id: string; name: string; category?: { name: string } | null };
  createdAt: string;
};

export function StoreCatalogManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [requests, setRequests] = useState<CatalogRequest[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selected = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId]
  );

  const grouped = useMemo(() => {
    if (!selected) return [];
    const byCat = new Map<string, { categoryName: string; items: CatalogItem[] }>();
    for (const item of selected.items) {
      const key = item.categoryId ?? "none";
      const name = item.category?.name ?? "Diğer";
      if (!byCat.has(key)) byCat.set(key, { categoryName: name, items: [] });
      byCat.get(key)!.items.push(item);
    }
    return [...byCat.values()];
  }, [selected]);

  async function load() {
    const [campaignRes, reqRes] = await Promise.all([
      fetch("/api/v1/admin/catalog/campaigns"),
      fetch("/api/v1/catalog-requests?limit=100"),
    ]);
    const campaignData = await campaignRes.json();
    const reqData = await reqRes.json();
    if (!campaignRes.ok) throw new Error(campaignData.error ?? "Kampanyalar yüklenemedi");

    const openCampaigns = (Array.isArray(campaignData) ? campaignData : []).filter(
      (c: Campaign) => c.openForRequests !== false
    );
    setCampaigns(openCampaigns);
    setRequests(Array.isArray(reqData) ? reqData : reqData.items ?? []);

    const nextId = openCampaigns.find((c: Campaign) => c.id === campaignId)?.id ?? openCampaigns[0]?.id ?? "";
    setCampaignId(nextId);

    const qty: Record<string, string> = {};
    for (const req of Array.isArray(reqData) ? reqData : reqData.items ?? []) {
      if (req.catalogItem?.id && req.quantity != null && req.status !== "REDDEDILDI") {
        qty[req.catalogItem.id] = String(req.quantity);
      }
    }
    setQuantities((prev) => ({ ...qty, ...prev }));
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const items = selected.items
        .map((item) => ({
          catalogItemId: item.id,
          quantity: Number(quantities[item.id] || 0),
        }))
        .filter((line) => Number.isFinite(line.quantity) && line.quantity >= 1);

      if (items.length === 0) {
        throw new Error("En az bir ürün için adet girin");
      }

      const res = await fetch("/api/v1/catalog-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: selected.id, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Talep gönderilemedi");
      setSuccess(`${items.length} ürün için adet bildirildi`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Talep gönderilemedi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kampanya Adet Bildirimi</h1>
        <p className="text-muted-foreground">
          Açık kampanyalardaki ürünler için gerekli adetleri tek seferde bildirin
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </p>
      )}

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Şu an açık kampanya yok.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Kampanya Seç</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                className="flex h-10 w-full max-w-xl rounded-xl border px-3 text-sm"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({CATALOG_CAMPAIGN_MODE_LABELS[c.mode]})
                  </option>
                ))}
              </select>
              {selected?.description && (
                <p className="mt-2 text-sm text-muted-foreground">{selected.description}</p>
              )}
            </CardContent>
          </Card>

          {selected && (
            <form onSubmit={submit} className="space-y-4">
              {grouped.map((group) => (
                <Card key={group.categoryName}>
                  <CardHeader>
                    <CardTitle className="text-lg">{group.categoryName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {item.referenceImageUrl ? (
                            <img
                              src={item.referenceImageUrl}
                              alt={item.name}
                              className="h-14 w-14 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                              Görsel
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-muted-foreground">{item.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="w-full space-y-1 sm:w-32">
                          <Label>Adet</Label>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={quantities[item.id] ?? ""}
                            onChange={(e) =>
                              setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            placeholder="0"
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
              <Button type="submit" disabled={loading}>
                {loading ? "Gönderiliyor..." : "Adetleri Gönder"}
              </Button>
            </form>
          )}
        </>
      )}

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Taleplerim</h2>
        {requests.map((req) => (
          <Card key={req.id}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="font-medium">{req.catalogItem.name}</div>
                <div className="text-sm text-muted-foreground">
                  {req.campaign?.name ?? "Kampanya"}
                  {req.catalogItem.category?.name ? ` · ${req.catalogItem.category.name}` : ""}
                </div>
                {req.quantity != null && <div className="text-sm">{req.quantity} adet</div>}
              </div>
              <StatusBadge status={req.status} />
            </CardContent>
          </Card>
        ))}
        {requests.length === 0 && (
          <p className="text-sm text-muted-foreground">Henüz talep yok</p>
        )}
      </div>
    </div>
  );
}
