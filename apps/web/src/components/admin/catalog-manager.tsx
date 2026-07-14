"use client";

import { useEffect, useState } from "react";
import { useIsStrictAdmin } from "@/lib/role-context";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATALOG_ITEM_TYPE_LABELS, type CatalogItemType } from "@magaza/shared";

type CatalogItem = {
  id: string;
  name: string;
  code: string;
  type: CatalogItemType;
  referenceImageUrl?: string | null;
  description?: string | null;
  active: boolean;
};

export function CatalogManager() {
  const isAdmin = useIsStrictAdmin();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<CatalogItemType>("FIXED");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/v1/admin/catalog");
    setItems(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("name", name);
    formData.append("code", code);
    formData.append("type", type);
    formData.append("description", description);
    if (file) formData.append("file", file);
    await fetch("/api/v1/admin/catalog", { method: "POST", body: formData });
    setName("");
    setCode("");
    setDescription("");
    setFile(null);
    await load();
    setLoading(false);
  }

  async function deactivate(id: string) {
    if (!isAdmin || !confirm("Ürün pasif edilsin mi?")) return;
    await fetch(`/api/v1/admin/catalog/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ürün Kataloğu</h1>
        <p className="text-muted-foreground">
          Sabit ve değişken ürün tanımları {isAdmin ? "" : "(salt okunur)"}
        </p>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Yeni Ürün</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createItem} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Ürün Adı</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Demir Baş" required />
              </div>
              <div className="space-y-2">
                <Label>Kod</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="DEMIR_BAS" required />
              </div>
              <div className="space-y-2">
                <Label>Tip</Label>
                <select className="flex h-10 w-full rounded-xl border px-3 text-sm" value={type} onChange={(e) => setType(e.target.value as CatalogItemType)}>
                  <option value="FIXED">Sabit</option>
                  <option value="VARIABLE">Değişken (adet ile talep)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Referans Görsel</Label>
                <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Açıklama</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading}>Ürün Ekle</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              {item.referenceImageUrl && (
                <img src={item.referenceImageUrl} alt={item.name} className="mb-3 h-32 w-full rounded-lg object-cover" />
              )}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{item.name}</h3>
                <Badge>{CATALOG_ITEM_TYPE_LABELS[item.type]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{item.code}</p>
              {item.description && <p className="mt-2 text-sm">{item.description}</p>}
              {isAdmin && (
                <Button variant="destructive" size="sm" className="mt-3" onClick={() => deactivate(item.id)}>
                  <Trash2 className="mr-1 h-4 w-4" /> Pasif Et
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
