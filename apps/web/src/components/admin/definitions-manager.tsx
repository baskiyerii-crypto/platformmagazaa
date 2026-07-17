"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { invalidateDefinitionsCache } from "@/lib/definitions-cache";

type SubType = { id: string; name: string; code: string };
type Category = {
  id: string;
  name: string;
  type: string;
  subTypes: SubType[];
};
type Placement = { id: string; name: string; code: string };
type ReyonCategory = { id: string; name: string; code: string };

type Definitions = {
  categories: Category[];
  placements: Placement[];
  reyonCategories: ReyonCategory[];
};

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "İşlem başarısız");
  }
  return data as T;
}

function DefinitionRow({
  name,
  code,
  editing,
  editName,
  editCode,
  onEditName,
  onEditCode,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  name: string;
  code: string;
  editing: boolean;
  editName: string;
  editCode: string;
  onEditName: (v: string) => void;
  onEditCode: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  if (editing) {
    return (
      <li className="space-y-2 rounded-lg border bg-secondary/40 p-3">
        <Input value={editName} onChange={(e) => onEditName(e.target.value)} placeholder="Ad" />
        <Input value={editCode} onChange={(e) => onEditCode(e.target.value)} placeholder="Kod" />
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={onSave}>Kaydet</Button>
          <Button type="button" size="sm" variant="outline" onClick={onCancelEdit}>İptal</Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
      <span>{name} ({code})</span>
      <div className="flex shrink-0 gap-1">
        <Button type="button" size="sm" variant="outline" onClick={onStartEdit}>Düzenle</Button>
        <Button type="button" size="sm" variant="outline" onClick={onDelete}>Sil</Button>
      </div>
    </li>
  );
}

export function DefinitionsManager() {
  const [defs, setDefs] = useState<Definitions | null>(null);
  const [subTypeName, setSubTypeName] = useState("");
  const [subTypeCode, setSubTypeCode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [placementName, setPlacementName] = useState("");
  const [placementCode, setPlacementCode] = useState("");
  const [reyonName, setReyonName] = useState("");
  const [reyonCode, setReyonCode] = useState("");
  const [editingSubTypeId, setEditingSubTypeId] = useState<string | null>(null);
  const [editingPlacementId, setEditingPlacementId] = useState<string | null>(null);
  const [editingReyonId, setEditingReyonId] = useState<string | null>(null);
  const [editSubTypeName, setEditSubTypeName] = useState("");
  const [editSubTypeCode, setEditSubTypeCode] = useState("");
  const [editPlacementName, setEditPlacementName] = useState("");
  const [editPlacementCode, setEditPlacementCode] = useState("");
  const [editReyonName, setEditReyonName] = useState("");
  const [editReyonCode, setEditReyonCode] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const data = await apiJson<Definitions>("/api/v1/definitions");
    setDefs(data);
    const magazaIci = data.categories.find((c) => c.type === "MAGAZA_ICI");
    if (!categoryId && magazaIci) {
      setCategoryId(magazaIci.id);
    } else if (!categoryId && data.categories[0]) {
      setCategoryId(data.categories[0].id);
    }
  }

  useEffect(() => { load(); }, []);

  async function addSubType(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiJson("/api/v1/definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "subType",
          data: { categoryId, name: subTypeName, code: subTypeCode, sortOrder: 0 },
        }),
      });
      setSubTypeName("");
      setSubTypeCode("");
      invalidateDefinitionsCache();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tür eklenemedi");
    }
  }

  async function addPlacement(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiJson("/api/v1/definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "placement",
          data: { name: placementName, code: placementCode, sortOrder: 0 },
        }),
      });
      setPlacementName("");
      setPlacementCode("");
      invalidateDefinitionsCache();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Konum eklenemedi");
    }
  }

  async function addReyonCategory(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiJson("/api/v1/definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reyonCategory",
          data: { name: reyonName, code: reyonCode, sortOrder: 0 },
        }),
      });
      setReyonName("");
      setReyonCode("");
      invalidateDefinitionsCache();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reyon kategorisi eklenemedi");
    }
  }

  function startEditSubType(st: SubType) {
    setEditingSubTypeId(st.id);
    setEditSubTypeName(st.name);
    setEditSubTypeCode(st.code);
    setEditingPlacementId(null);
  }

  function startEditPlacement(p: Placement) {
    setEditingPlacementId(p.id);
    setEditPlacementName(p.name);
    setEditPlacementCode(p.code);
    setEditingSubTypeId(null);
    setEditingReyonId(null);
  }

  function startEditReyon(r: ReyonCategory) {
    setEditingReyonId(r.id);
    setEditReyonName(r.name);
    setEditReyonCode(r.code);
    setEditingSubTypeId(null);
    setEditingPlacementId(null);
  }

  async function saveSubType(id: string) {
    setError("");
    try {
      await apiJson(`/api/v1/definitions/sub-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editSubTypeName, code: editSubTypeCode }),
      });
      setEditingSubTypeId(null);
      invalidateDefinitionsCache();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tür güncellenemedi");
    }
  }

  async function deleteSubType(id: string, name: string) {
    if (!confirm(`"${name}" türünü silmek istediğinize emin misiniz?`)) return;
    setError("");
    try {
      await apiJson(`/api/v1/definitions/sub-types/${id}`, { method: "DELETE" });
      invalidateDefinitionsCache();
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tür silinemedi";
      if (message.includes("bulunamadı")) {
        invalidateDefinitionsCache();
        await load();
        setError("Kayıt zaten silinmiş; liste yenilendi.");
        return;
      }
      setError(message);
    }
  }

  async function savePlacement(id: string) {
    setError("");
    try {
      await apiJson(`/api/v1/definitions/placements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editPlacementName, code: editPlacementCode }),
      });
      setEditingPlacementId(null);
      invalidateDefinitionsCache();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Konum güncellenemedi");
    }
  }

  async function deletePlacement(id: string, name: string) {
    if (!confirm(`"${name}" konumunu silmek istediğinize emin misiniz?`)) return;
    setError("");
    try {
      await apiJson(`/api/v1/definitions/placements/${id}`, { method: "DELETE" });
      invalidateDefinitionsCache();
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Konum silinemedi";
      if (message.includes("bulunamadı")) {
        invalidateDefinitionsCache();
        await load();
        setError("Kayıt zaten silinmiş; liste yenilendi.");
        return;
      }
      setError(message);
    }
  }

  async function saveReyon(id: string) {
    setError("");
    try {
      await apiJson(`/api/v1/definitions/reyon-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editReyonName, code: editReyonCode }),
      });
      setEditingReyonId(null);
      invalidateDefinitionsCache();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reyon kategorisi güncellenemedi");
    }
  }

  async function deleteReyon(id: string, name: string) {
    if (!confirm(`"${name}" reyon kategorisini silmek istediğinize emin misiniz?`)) return;
    setError("");
    try {
      await apiJson(`/api/v1/definitions/reyon-categories/${id}`, { method: "DELETE" });
      invalidateDefinitionsCache();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reyon kategorisi silinemedi");
    }
  }

  const selectedCategory = defs?.categories.find((c) => c.id === categoryId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Tanımlar</h1>
        <p className="text-muted-foreground">
          Envanter türleri, mağaza içi konumlar ve reyon kategorileri buradan yönetilir. Mağaza yalnızca listeden seçer.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Envanter Türü Ekle</CardTitle>
            <p className="text-sm text-muted-foreground">Mağaza İçi için: Tabela, Lightbox, Folyo, Görsel vb.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={addSubType} className="space-y-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <select className="flex h-10 w-full rounded-xl border px-3 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  {defs?.categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Ad</Label>
                <Input value={subTypeName} onChange={(e) => setSubTypeName(e.target.value)} placeholder="Örn. Lightbox" required />
              </div>
              <div className="space-y-2">
                <Label>Kod</Label>
                <Input value={subTypeCode} onChange={(e) => setSubTypeCode(e.target.value)} placeholder="Örn. LIGHTBOX" required />
              </div>
              <Button type="submit">Tür Ekle</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mağaza İçi Konum Ekle</CardTitle>
            <p className="text-sm text-muted-foreground">Mağaza kayıt açarken bu konumlardan seçer.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={addPlacement} className="space-y-4">
              <div className="space-y-2">
                <Label>Ad (ör. Giriş Üstü)</Label>
                <Input value={placementName} onChange={(e) => setPlacementName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Kod</Label>
                <Input value={placementCode} onChange={(e) => setPlacementCode(e.target.value)} placeholder="Örn. GIRIS_USTU" required />
              </div>
              <Button type="submit">Konum Ekle</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reyon Kategorisi Ekle</CardTitle>
            <p className="text-sm text-muted-foreground">
              Mağaza içi kayıtlar Kadın, Erkek, Çocuk gibi bir reyonla sınıflandırılır.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={addReyonCategory} className="space-y-4">
              <div className="space-y-2">
                <Label>Ad</Label>
                <Input
                  value={reyonName}
                  onChange={(e) => setReyonName(e.target.value)}
                  placeholder="Örn. Kadın"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Kod</Label>
                <Input
                  value={reyonCode}
                  onChange={(e) => setReyonCode(e.target.value)}
                  placeholder="Örn. KADIN"
                  required
                />
              </div>
              <Button type="submit">Reyon Kategorisi Ekle</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {defs?.categories.map((cat) => (
          <Card key={cat.id}>
            <CardHeader>
              <CardTitle>{cat.name} — Türler</CardTitle>
              {cat.type === "MAGAZA_ICI" && (
                <p className="text-sm text-muted-foreground">Mağaza içi envanter türleri</p>
              )}
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {cat.subTypes.map((st) => (
                  <DefinitionRow
                    key={st.id}
                    name={st.name}
                    code={st.code}
                    editing={editingSubTypeId === st.id}
                    editName={editSubTypeName}
                    editCode={editSubTypeCode}
                    onEditName={setEditSubTypeName}
                    onEditCode={setEditSubTypeCode}
                    onStartEdit={() => startEditSubType(st)}
                    onCancelEdit={() => setEditingSubTypeId(null)}
                    onSave={() => saveSubType(st.id)}
                    onDelete={() => deleteSubType(st.id, st.name)}
                  />
                ))}
                {!cat.subTypes.length && (
                  <li className="text-sm text-muted-foreground">Henüz tür yok</li>
                )}
              </ul>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <CardTitle>Tanımlı Konumlar</CardTitle>
            <p className="text-sm text-muted-foreground">Mağaza içi reklam ve AVM video konumları</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {defs?.placements.map((p) => (
                <DefinitionRow
                  key={p.id}
                  name={p.name}
                  code={p.code}
                  editing={editingPlacementId === p.id}
                  editName={editPlacementName}
                  editCode={editPlacementCode}
                  onEditName={setEditPlacementName}
                  onEditCode={setEditPlacementCode}
                  onStartEdit={() => startEditPlacement(p)}
                  onCancelEdit={() => setEditingPlacementId(null)}
                  onSave={() => savePlacement(p.id)}
                  onDelete={() => deletePlacement(p.id, p.name)}
                />
              ))}
              {!defs?.placements.length && (
                <li className="text-sm text-muted-foreground">Henüz konum yok</li>
              )}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tanımlı Reyon Kategorileri</CardTitle>
            <p className="text-sm text-muted-foreground">
              Mağaza içi envanter, sonuç ve Excel raporlarında kullanılır.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {defs?.reyonCategories.map((r) => (
                <DefinitionRow
                  key={r.id}
                  name={r.name}
                  code={r.code}
                  editing={editingReyonId === r.id}
                  editName={editReyonName}
                  editCode={editReyonCode}
                  onEditName={setEditReyonName}
                  onEditCode={setEditReyonCode}
                  onStartEdit={() => startEditReyon(r)}
                  onCancelEdit={() => setEditingReyonId(null)}
                  onSave={() => saveReyon(r.id)}
                  onDelete={() => deleteReyon(r.id, r.name)}
                />
              ))}
              {!defs?.reyonCategories.length && (
                <li className="text-sm text-muted-foreground">
                  Henüz reyon kategorisi yok
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {selectedCategory?.type === "MAGAZA_ICI" && (
        <p className="text-sm text-muted-foreground">
          Seçili kategori: <strong>{selectedCategory.name}</strong> — buraya eklediğiniz türler mağaza içi kayıt formunda görünür.
        </p>
      )}
    </div>
  );
}
