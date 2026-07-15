"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { ClickableThumbnail, ImageLightbox } from "@/components/image-lightbox";
import { formatDate } from "@/lib/utils";
import {
  ADMIN_STATUS_TRANSITIONS,
  CHANGE_REQUEST_STATUS_LABELS,
  CHANGE_TARGET_TYPES,
  canApproveStoreUpdate,
  thumbUrl,
  type PaginatedResponse,
  type ChangeRequestStatus,
} from "@magaza/shared";
import { fetchSlimStores } from "@/lib/stores-cache";

type ChangeRequestTarget = {
  summary: string;
  typeLabel: string;
  subTypeName?: string | null;
  placementName?: string | null;
  konum?: string | null;
  dimensions?: string | null;
  adet?: number | null;
  gorselUrl?: string | null;
};

type RequestImage = {
  url: string;
  isArchived: boolean;
  createdAt: string;
};

type VisualRequest = {
  id: string;
  store: { id: string; name: string };
  targetType: string;
  status: ChangeRequestStatus;
  note?: string | null;
  createdAt: string;
  target?: ChangeRequestTarget | null;
  images?: RequestImage[];
};

type CatalogRequest = {
  id: string;
  store: { id: string; name: string };
  catalogItem: { name: string };
  quantity?: number | null;
  status: ChangeRequestStatus;
  note?: string | null;
  createdAt: string;
};

type Store = { id: string; name: string };

function RequestImages({ images, target }: { images?: RequestImage[]; target?: ChangeRequestTarget | null }) {
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);

  const archived = images?.find((img) => img.isArchived);
  const uploaded = images?.find((img) => !img.isArchived);

  const oldUrl = archived?.url ?? null;
  const newUrl = uploaded?.url ?? target?.gorselUrl ?? null;

  if (!oldUrl && !newUrl) {
    return <p className="text-sm text-muted-foreground">Görsel yok</p>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-4">
        {oldUrl && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Eski görsel</p>
            <ClickableThumbnail
              src={thumbUrl(oldUrl) ?? oldUrl}
              alt="Eski görsel"
              onClick={() => setLightbox({ src: oldUrl, title: "Eski görsel" })}
            />
          </div>
        )}
        {newUrl && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Güncel görsel</p>
            <ClickableThumbnail
              src={thumbUrl(newUrl) ?? newUrl}
              alt="Güncel görsel"
              onClick={() => setLightbox({ src: newUrl, title: "Güncel görsel" })}
            />
          </div>
        )}
      </div>
      {lightbox && (
        <ImageLightbox
          open
          onOpenChange={(open) => !open && setLightbox(null)}
          src={lightbox.src}
          title={lightbox.title}
        />
      )}
    </>
  );
}

export function RequestsManager() {
  const [tab, setTab] = useState<"visual" | "catalog">("visual");
  const [visualRequests, setVisualRequests] = useState<VisualRequest[]>([]);
  const [catalogRequests, setCatalogRequests] = useState<CatalogRequest[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [status, setStatus] = useState("");
  const [storeId, setStoreId] = useState("");
  const [targetType, setTargetType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  async function loadVisual() {
    const params = new URLSearchParams({ detail: "true" });
    if (status) params.set("status", status);
    if (storeId) params.set("storeId", storeId);
    if (targetType) params.set("targetType", targetType);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`/api/v1/change-requests?${params}`);
    const data: PaginatedResponse<VisualRequest> = await res.json();
    setVisualRequests(data.items);
    setSelected(new Set());
  }

  async function loadCatalog() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (storeId) params.set("storeId", storeId);
    const res = await fetch(`/api/v1/catalog-requests?${params}`);
    const data: PaginatedResponse<CatalogRequest> = await res.json();
    setCatalogRequests(data.items);
    setSelected(new Set());
  }

  useEffect(() => {
    fetchSlimStores().then(setStores);
  }, []);

  useEffect(() => {
    if (tab === "visual") loadVisual();
    else loadCatalog();
  }, [tab, status, storeId, targetType, dateFrom, dateTo]);

  const currentIds =
    tab === "visual" ? visualRequests.map((r) => r.id) : catalogRequests.map((r) => r.id);
  const allSelected = currentIds.length > 0 && currentIds.every((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(currentIds));
  }

  async function updateVisualStatus(id: string, next: ChangeRequestStatus) {
    await fetch(`/api/v1/change-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    loadVisual();
  }

  async function updateCatalogStatus(id: string, next: ChangeRequestStatus) {
    await fetch(`/api/v1/catalog-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    loadCatalog();
  }

  async function deleteOne(id: string, label: string) {
    if (busy) return;
    if (!confirm(`Bu talep silinsin mi?\n${label}`)) return;
    setBusy(true);
    try {
      const url =
        tab === "visual"
          ? `/api/v1/change-requests/${id}`
          : `/api/v1/catalog-requests/${id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Silinemedi.");
        return;
      }
      if (tab === "visual") await loadVisual();
      else await loadCatalog();
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelected() {
    if (busy || selected.size === 0) return;
    if (!confirm(`${selected.size} talep silinsin mi? Bu işlem geri alınamaz.`)) return;
    setBusy(true);
    try {
      const url =
        tab === "visual" ? "/api/v1/change-requests" : "/api/v1/catalog-requests";
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Toplu silme başarısız.");
        return;
      }
      if (tab === "visual") await loadVisual();
      else await loadCatalog();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Talepler</h1>
        <p className="text-muted-foreground">Görsel değişim ve ürün talepleri — tekli veya toplu silme</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={tab === "visual" ? "default" : "outline"} onClick={() => setTab("visual")}>
          Görsel Değişim
        </Button>
        <Button variant={tab === "catalog" ? "default" : "outline"} onClick={() => setTab("catalog")}>
          Ürün Talepleri
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="space-y-2">
          <Label>Durum</Label>
          <select className="flex h-10 w-full rounded-xl border px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tümü</option>
            {Object.entries(CHANGE_REQUEST_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Mağaza</Label>
          <select className="flex h-10 w-full rounded-xl border px-3 text-sm" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">Tümü</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {tab === "visual" && (
          <div className="space-y-2">
            <Label>Hedef</Label>
            <select className="flex h-10 w-full rounded-xl border px-3 text-sm" value={targetType} onChange={(e) => setTargetType(e.target.value)}>
              <option value="">Tümü</option>
              {CHANGE_TARGET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
        <div className="space-y-2">
          <Label>Başlangıç</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Bitiş</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-secondary/20 px-4 py-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={allSelected}
            onChange={toggleAll}
            disabled={currentIds.length === 0 || busy}
          />
          Tümünü seç ({currentIds.length})
        </label>
        <Button
          variant="destructive"
          size="sm"
          disabled={selected.size === 0 || busy}
          onClick={deleteSelected}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Seçilenleri sil ({selected.size})
        </Button>
      </div>

      <div className="space-y-4">
        {tab === "visual"
          ? visualRequests.map((req) => {
              const nextStatuses = ADMIN_STATUS_TRANSITIONS[req.status] ?? [];
              const target = req.target;

              return (
                <Card key={req.id} className={selected.has(req.id) ? "ring-2 ring-primary/40" : undefined}>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0"
                          checked={selected.has(req.id)}
                          onChange={() => toggleOne(req.id)}
                          disabled={busy}
                          aria-label="Talep seç"
                        />
                        <div className="min-w-0 flex-1 space-y-3">
                          <div>
                            <div className="font-semibold">{req.store.name}</div>
                            <div className="text-sm text-muted-foreground">{formatDate(req.createdAt)}</div>
                          </div>

                          {target ? (
                            <div className="rounded-xl border bg-secondary/30 p-4 text-sm">
                              <div className="font-medium">{target.summary}</div>
                              {target.dimensions && (
                                <div className="mt-1 text-muted-foreground">Ölçü: {target.dimensions}</div>
                              )}
                              {target.adet != null && target.adet > 1 && (
                                <div className="text-muted-foreground">Adet: {target.adet}</div>
                              )}
                              {target.konum && !target.placementName && (
                                <div className="text-muted-foreground">Konum: {target.konum}</div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">{req.targetType}</div>
                          )}

                          {req.note && <p className="text-sm">{req.note}</p>}

                          <RequestImages images={req.images} target={target} />
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-2 lg:items-end">
                        <StatusBadge status={req.status} />
                        {canApproveStoreUpdate(req.status) && (
                          <Button
                            size="sm"
                            onClick={() => updateVisualStatus(req.id, "MAGAZADA_GUNCELLENDI")}
                          >
                            Doğru Güncellendi, Kapat
                          </Button>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {nextStatuses.map((s) => (
                            <Button key={s} size="sm" variant="outline" onClick={() => updateVisualStatus(req.id, s)}>
                              {CHANGE_REQUEST_STATUS_LABELS[s]}
                            </Button>
                          ))}
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busy}
                            onClick={() =>
                              deleteOne(req.id, `${req.store.name} · ${target?.summary ?? req.targetType}`)
                            }
                          >
                            <Trash2 className="mr-1 h-3 w-3" /> Sil
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          : catalogRequests.map((req) => {
              const nextStatuses = ADMIN_STATUS_TRANSITIONS[req.status] ?? [];
              return (
                <Card key={req.id} className={selected.has(req.id) ? "ring-2 ring-primary/40" : undefined}>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0"
                          checked={selected.has(req.id)}
                          onChange={() => toggleOne(req.id)}
                          disabled={busy}
                          aria-label="Talep seç"
                        />
                        <div>
                          <div className="font-semibold">{req.store.name} · {req.catalogItem.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {req.quantity ? `${req.quantity} adet · ` : ""}{formatDate(req.createdAt)}
                          </div>
                          {req.note && <p className="mt-2 text-sm">{req.note}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-2 lg:items-end">
                        <StatusBadge status={req.status} />
                        <div className="flex flex-wrap gap-2">
                          {nextStatuses.map((s) => (
                            <Button key={s} size="sm" variant="outline" onClick={() => updateCatalogStatus(req.id, s)}>
                              {CHANGE_REQUEST_STATUS_LABELS[s]}
                            </Button>
                          ))}
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busy}
                            onClick={() =>
                              deleteOne(req.id, `${req.store.name} · ${req.catalogItem.name}`)
                            }
                          >
                            <Trash2 className="mr-1 h-3 w-3" /> Sil
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

        {currentIds.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Talep bulunamadı.</p>
        )}
      </div>
    </div>
  );
}
