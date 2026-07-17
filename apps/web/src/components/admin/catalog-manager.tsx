"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useIsStrictAdmin } from "@/lib/role-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CATALOG_CAMPAIGN_MODE_LABELS,
  CATALOG_ITEM_TYPE_LABELS,
  type CatalogCampaignMode,
  type CatalogItemType,
} from "@magaza/shared";

type Category = { id: string; name: string; sortOrder: number; active: boolean };
type CatalogItem = {
  id: string;
  name: string;
  code: string;
  type: CatalogItemType;
  description?: string | null;
  referenceImageUrl?: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  active: boolean;
};
type Campaign = {
  id: string;
  name: string;
  description?: string | null;
  mode: CatalogCampaignMode;
  startsAt?: string | null;
  endsAt?: string | null;
  active: boolean;
  openForRequests?: boolean;
  categories: Category[];
  items: CatalogItem[];
  _count?: { items: number; requests: number };
};

function toDateInput(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function CatalogManager() {
  const isAdmin = useIsStrictAdmin();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [campaignName, setCampaignName] = useState("");
  const [campaignDesc, setCampaignDesc] = useState("");
  const [campaignMode, setCampaignMode] = useState<CatalogCampaignMode>("PERMANENT");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const [categoryName, setCategoryName] = useState("");

  const [itemName, setItemName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [itemType, setItemType] = useState<CatalogItemType>("FIXED");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemFile, setItemFile] = useState<File | null>(null);

  const selected = useMemo(
    () => campaigns.find((c) => c.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId]
  );

  async function load() {
    const res = await fetch("/api/v1/admin/catalog/campaigns?all=1");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Kampanyalar yüklenemedi");
    setCampaigns(data);
    if (data[0] && !selectedCampaignId) setSelectedCampaignId(data[0].id);
    if (selectedCampaignId && !data.find((c: Campaign) => c.id === selectedCampaignId) && data[0]) {
      setSelectedCampaignId(data[0].id);
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"));
  }, []);

  useEffect(() => {
    if (selected?.categories[0] && !itemCategoryId) {
      setItemCategoryId(selected.categories[0].id);
    }
  }, [selected, itemCategoryId]);

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/admin/catalog/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          description: campaignDesc || null,
          mode: campaignMode,
          startsAt: campaignMode === "PERIODIC" ? startsAt : null,
          endsAt: campaignMode === "PERIODIC" ? endsAt : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kampanya eklenemedi");
      setCampaignName("");
      setCampaignDesc("");
      setStartsAt("");
      setEndsAt("");
      setCampaignMode("PERMANENT");
      await load();
      setSelectedCampaignId(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kampanya eklenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin || !selectedCampaignId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/admin/catalog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: selectedCampaignId, name: categoryName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kategori eklenemedi");
      setCategoryName("");
      await load();
      setItemCategoryId(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kategori eklenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin || !selectedCampaignId || !itemCategoryId) return;
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("name", itemName);
      formData.append("code", itemCode);
      formData.append("type", itemType);
      formData.append("campaignId", selectedCampaignId);
      formData.append("categoryId", itemCategoryId);
      formData.append("description", itemDescription);
      if (itemFile) formData.append("file", itemFile);
      const res = await fetch("/api/v1/admin/catalog", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ürün eklenemedi");
      setItemName("");
      setItemCode("");
      setItemDescription("");
      setItemFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ürün eklenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function deactivateCampaign(id: string) {
    if (!isAdmin || !confirm("Kampanya pasif edilsin mi?")) return;
    await fetch(`/api/v1/admin/catalog/campaigns/${id}`, { method: "DELETE" });
    await load();
  }

  async function deactivateCategory(id: string) {
    if (!isAdmin || !confirm("Kategori pasif edilsin mi?")) return;
    await fetch(`/api/v1/admin/catalog/categories/${id}`, { method: "DELETE" });
    await load();
  }

  async function deactivateItem(id: string) {
    if (!isAdmin || !confirm("Ürün pasif edilsin mi?")) return;
    await fetch(`/api/v1/admin/catalog/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kampanya / Sabit Baskılar</h1>
        <p className="text-muted-foreground">
          Yönetici kampanya ve kategorileri tanımlar; mağazalar adet bildirir{" "}
          {isAdmin ? "" : "(salt okunur)"}
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Yeni Kampanya</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createCampaign} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Kampanya Adı</Label>
                <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Tip</Label>
                <select
                  className="flex h-10 w-full rounded-xl border px-3 text-sm"
                  value={campaignMode}
                  onChange={(e) => setCampaignMode(e.target.value as CatalogCampaignMode)}
                >
                  <option value="PERMANENT">Kalıcı</option>
                  <option value="PERIODIC">Dönemlik</option>
                </select>
              </div>
              {campaignMode === "PERIODIC" && (
                <>
                  <div className="space-y-2">
                    <Label>Başlangıç</Label>
                    <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Bitiş</Label>
                    <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
                  </div>
                </>
              )}
              <div className="space-y-2 md:col-span-2">
                <Label>Açıklama</Label>
                <Input value={campaignDesc} onChange={(e) => setCampaignDesc(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading}>
                <Plus className="mr-1 h-4 w-4" /> Kampanya Ekle
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {campaigns.map((c) => (
          <Button
            key={c.id}
            variant={selectedCampaignId === c.id ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedCampaignId(c.id);
              setItemCategoryId(c.categories[0]?.id ?? "");
            }}
          >
            {c.name}
            {!c.active ? " (pasif)" : c.openForRequests ? "" : " (kapalı)"}
          </Button>
        ))}
      </div>

      {selected && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>{selected.name}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {CATALOG_CAMPAIGN_MODE_LABELS[selected.mode]}
                  {selected.mode === "PERIODIC"
                    ? ` · ${toDateInput(selected.startsAt)} → ${toDateInput(selected.endsAt)}`
                    : ""}
                  {` · ${selected._count?.items ?? selected.items.length} ürün · ${selected._count?.requests ?? 0} talep`}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge>{selected.openForRequests ? "Açık" : "Kapalı"}</Badge>
                {isAdmin && (
                  <Button variant="destructive" size="sm" onClick={() => deactivateCampaign(selected.id)}>
                    <Trash2 className="mr-1 h-4 w-4" /> Pasif
                  </Button>
                )}
              </div>
            </CardHeader>
            {selected.description && (
              <CardContent>
                <p className="text-sm text-muted-foreground">{selected.description}</p>
              </CardContent>
            )}
          </Card>

          {isAdmin && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Kategori Ekle</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={createCategory} className="flex gap-2">
                    <Input
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="Örn. Vitrin Baskıları"
                      required
                    />
                    <Button type="submit" disabled={loading}>
                      Ekle
                    </Button>
                  </form>
                  <div className="mt-4 space-y-2">
                    {selected.categories.map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                        <span>{cat.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => deactivateCategory(cat.id)}>
                          Pasif
                        </Button>
                      </div>
                    ))}
                    {selected.categories.length === 0 && (
                      <p className="text-sm text-muted-foreground">Henüz kategori yok</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ürün Ekle</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={createItem} className="grid gap-3">
                    <div className="space-y-2">
                      <Label>Kategori</Label>
                      <select
                        className="flex h-10 w-full rounded-xl border px-3 text-sm"
                        value={itemCategoryId}
                        onChange={(e) => setItemCategoryId(e.target.value)}
                        required
                      >
                        <option value="">Seçin</option>
                        {selected.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Ürün Adı</Label>
                      <Input value={itemName} onChange={(e) => setItemName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Kod</Label>
                      <Input value={itemCode} onChange={(e) => setItemCode(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Tip</Label>
                      <select
                        className="flex h-10 w-full rounded-xl border px-3 text-sm"
                        value={itemType}
                        onChange={(e) => setItemType(e.target.value as CatalogItemType)}
                      >
                        <option value="FIXED">Sabit</option>
                        <option value="VARIABLE">Değişken</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Referans Görsel</Label>
                      <Input type="file" accept="image/*" onChange={(e) => setItemFile(e.target.files?.[0] ?? null)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Açıklama</Label>
                      <Input value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} />
                    </div>
                    <Button type="submit" disabled={loading || !itemCategoryId}>
                      Ürün Ekle
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {selected.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  {item.referenceImageUrl && (
                    <img
                      src={item.referenceImageUrl}
                      alt={item.name}
                      className="mb-3 h-32 w-full rounded-lg object-cover"
                    />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{item.name}</h3>
                    <Badge>{CATALOG_ITEM_TYPE_LABELS[item.type]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.code}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.category?.name ?? "Kategori yok"}
                  </p>
                  {item.description && <p className="mt-2 text-sm">{item.description}</p>}
                  {isAdmin && (
                    <Button variant="destructive" size="sm" className="mt-3" onClick={() => deactivateItem(item.id)}>
                      <Trash2 className="mr-1 h-4 w-4" /> Pasif Et
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            {selected.items.length === 0 && (
              <p className="text-sm text-muted-foreground">Bu kampanyada henüz ürün yok</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
