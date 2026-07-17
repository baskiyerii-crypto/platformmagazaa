"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import type { ChangeRequestStatus } from "@magaza/shared";

type Product = {
  id: string;
  name: string;
  referenceImageUrl?: string | null;
  description?: string | null;
};

type ProductRequest = {
  id: string;
  quantity?: number | null;
  status: ChangeRequestStatus;
  catalogItem: Product;
};

export function ProductRequestManager() {
  const [items, setItems] = useState<Product[]>([]);
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selected = items.find((item) => item.id === selectedId);

  async function load() {
    const [catalogRes, requestRes] = await Promise.all([
      fetch("/api/v1/admin/catalog?scope=product"),
      fetch("/api/v1/catalog-requests?scope=product&limit=100"),
    ]);
    const catalog = await catalogRes.json();
    const requestData = await requestRes.json();
    if (!catalogRes.ok) throw new Error(catalog.error ?? "Ürünler yüklenemedi");
    setItems(catalog);
    setRequests(requestData.items ?? []);
    if (catalog[0] && !selectedId) setSelectedId(catalog[0].id);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/catalog-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogItemId: selectedId, quantity: Number(quantity) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Talep oluşturulamadı");
      setQuantity("1");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Talep oluşturulamadı");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ürün Talepleri</h1>
        <p className="text-muted-foreground">Kampanyadan bağımsız ürünler için adet bildirimi</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Card
            key={item.id}
            className={`cursor-pointer ${selectedId === item.id ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSelectedId(item.id)}
          >
            <CardContent className="p-4">
              {item.referenceImageUrl && (
                <img src={item.referenceImageUrl} alt={item.name} className="mb-2 h-28 w-full rounded-lg object-cover" />
              )}
              <h3 className="font-semibold">{item.name}</h3>
              {item.description && <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {selected && (
        <Card>
          <CardHeader><CardTitle>{selected.name} — Talep Aç</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="max-w-md space-y-4">
              <div className="space-y-2">
                <Label>Adet</Label>
                <Input type="number" min={1} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading}>{loading ? "Gönderiliyor..." : "Talep Oluştur"}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Ürün Taleplerim</h2>
        {requests.map((request) => (
          <Card key={request.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{request.catalogItem.name}</div>
                <div className="text-sm">{request.quantity ?? 0} adet</div>
              </div>
              <StatusBadge status={request.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
