"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import {
  CATALOG_ITEM_TYPE_LABELS,
  CHANGE_REQUEST_STATUS_LABELS,
  type CatalogItemType,
  type ChangeRequestStatus,
} from "@magaza/shared";

type CatalogItem = {
  id: string;
  name: string;
  type: CatalogItemType;
  referenceImageUrl?: string | null;
  description?: string | null;
};

type CatalogRequest = {
  id: string;
  quantity?: number | null;
  note?: string | null;
  status: ChangeRequestStatus;
  catalogItem: CatalogItem;
  createdAt: string;
};

export function StoreCatalogManager() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [requests, setRequests] = useState<CatalogRequest[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = items.find((i) => i.id === selectedId);

  async function load() {
    const [catalog, reqs] = await Promise.all([
      fetch("/api/v1/admin/catalog").then((r) => r.json()),
      fetch("/api/v1/catalog-requests").then((r) => r.json()),
    ]);
    const catalogItems = Array.isArray(catalog) ? catalog : catalog.items ?? [];
    const reqItems = Array.isArray(reqs) ? reqs : reqs.items ?? [];
    setItems(catalogItems);
    setRequests(reqItems);
    if (catalogItems[0] && !selectedId) setSelectedId(catalogItems[0].id);
  }

  useEffect(() => {
    load();
  }, []);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("catalogItemId", selectedId);
    if (selected?.type === "VARIABLE") formData.append("quantity", quantity);
    if (note) formData.append("note", note);
    const res = await fetch("/api/v1/catalog-requests", { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Talep oluşturulamadı");
    } else {
      setNote("");
      setQuantity("1");
      await load();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ürün Talepleri</h1>
        <p className="text-muted-foreground">Yönetici tanımlı ürünler için talep açın</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Card
            key={item.id}
            className={`cursor-pointer transition ${selectedId === item.id ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSelectedId(item.id)}
          >
            <CardContent className="p-4">
              {item.referenceImageUrl && (
                <img src={item.referenceImageUrl} alt={item.name} className="mb-2 h-28 w-full rounded-lg object-cover" />
              )}
              <h3 className="font-semibold">{item.name}</h3>
              <Badge className="mt-1">{CATALOG_ITEM_TYPE_LABELS[item.type]}</Badge>
              {item.description && <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>{selected.name} — Talep Aç</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitRequest} className="space-y-4 max-w-md">
              {selected.type === "VARIABLE" && (
                <div className="space-y-2">
                  <Label>Adet</Label>
                  <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                </div>
              )}
              <div className="space-y-2">
                <Label>Not (opsiyonel)</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading}>Talep Oluştur</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Taleplerim</h2>
        {requests.map((req) => (
          <Card key={req.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{req.catalogItem.name}</div>
                {req.quantity && <div className="text-sm">{req.quantity} adet</div>}
                {req.note && <div className="text-sm text-muted-foreground">{req.note}</div>}
              </div>
              <StatusBadge status={req.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
