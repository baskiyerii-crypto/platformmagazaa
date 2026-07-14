"use client";

import { useEffect, useState } from "react";
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
  }

  async function loadCatalog() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (storeId) params.set("storeId", storeId);
    const res = await fetch(`/api/v1/catalog-requests?${params}`);
    const data: PaginatedResponse<CatalogRequest> = await res.json();
    setCatalogRequests(data.items);
  }

  useEffect(() => {
    fetchSlimStores().then(setStores);
  }, []);

  useEffect(() => {
    if (tab === "visual") loadVisual();
    else loadCatalog();
  }, [tab, status, storeId, targetType, dateFrom, dateTo]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Talepler</h1>
        <p className="text-muted-foreground">Görsel değişim ve ürün talepleri</p>
      </div>

      <div className="flex gap-2">
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

      <div className="space-y-4">
        {tab === "visual"
          ? visualRequests.map((req) => {
              const nextStatuses = ADMIN_STATUS_TRANSITIONS[req.status] ?? [];
              const target = req.target;

              return (
                <Card key={req.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                <Card key={req.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="font-semibold">{req.store.name} · {req.catalogItem.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {req.quantity ? `${req.quantity} adet · ` : ""}{formatDate(req.createdAt)}
                        </div>
                        {req.note && <p className="mt-2 text-sm">{req.note}</p>}
                      </div>
                      <div className="flex flex-col items-start gap-2 lg:items-end">
                        <StatusBadge status={req.status} />
                        <div className="flex flex-wrap gap-2">
                          {nextStatuses.map((s) => (
                            <Button key={s} size="sm" variant="outline" onClick={() => updateCatalogStatus(req.id, s)}>
                              {CHANGE_REQUEST_STATUS_LABELS[s]}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>
    </div>
  );
}
