"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { ClickableThumbnail, ImageLightbox } from "@/components/image-lightbox";
import { SizeSummaryPanel } from "@/components/admin/size-summary-panel";
import { formatDate } from "@/lib/utils";
import type { SizeGroup } from "@/lib/size-groups";
import { downloadExcelBlob } from "@/lib/download-excel";
import {
  ADMIN_STATUS_TRANSITIONS,
  CHANGE_REQUEST_STATUS_LABELS,
  CHANGE_TARGET_TYPES,
  CHANGE_TARGET_TYPE_LABELS,
  changeTargetTypeLabel,
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
  en?: number | null;
  boy?: number | null;
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
  campaign?: { id: string; name: string } | null;
  catalogItem: {
    name: string;
    code?: string;
    category?: { id: string; name: string } | null;
  };
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
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [sizeGroups, setSizeGroups] = useState<SizeGroup[]>([]);
  const [sizeLoading, setSizeLoading] = useState(false);

  const productTotals = useMemo(() => {
    const map = new Map<string, { product: string; category: string; campaign: string; adet: number; kayit: number }>();
    for (const req of catalogRequests) {
      const key = `${req.campaign?.id ?? ""}:${req.catalogItem.name}`;
      const current = map.get(key) ?? {
        product: req.catalogItem.name,
        category: req.catalogItem.category?.name ?? "",
        campaign: req.campaign?.name ?? "",
        adet: 0,
        kayit: 0,
      };
      current.adet += req.quantity ?? 0;
      current.kayit += 1;
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.adet - a.adet);
  }, [catalogRequests]);

  function buildExportParams(includeTab = true) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (storeId) params.set("storeId", storeId);
    if (targetType) params.set("targetType", targetType);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (tab === "catalog") params.set("scope", "product");
    if (includeTab) params.set("tab", tab === "catalog" ? "catalog" : tab === "visual" ? "visual" : "all");
    return params;
  }

  async function loadSizeSummary() {
    setSizeLoading(true);
    try {
      const params = buildExportParams(false);
      params.set("summaryOnly", "1");
      const res = await fetch(`/api/v1/admin/export/requests?${params}`);
      if (!res.ok) {
        setSizeGroups([]);
        return;
      }
      const data = await res.json();
      setSizeGroups(data.groups ?? []);
    } finally {
      setSizeLoading(false);
    }
  }

  async function downloadRequestsExcel() {
    setExporting(true);
    setExportError("");
    const params = buildExportParams(true);
    params.set("format", "excel");
    // Respect current tab — visual change requests vs continuous product requests
    if (tab === "visual") {
      params.set("tab", "visual");
      params.delete("scope");
    } else if (tab === "catalog") {
      params.set("tab", "catalog");
      params.set("scope", "product");
    } else {
      params.set("tab", "all");
    }
    const filename =
      tab === "visual"
        ? `gorsel-talepler-${new Date().toISOString().slice(0, 10)}.xlsx`
        : tab === "catalog"
          ? `urun-talepleri-${new Date().toISOString().slice(0, 10)}.xlsx`
          : `talepler-${new Date().toISOString().slice(0, 10)}.xlsx`;
    try {
      await downloadExcelBlob(`/api/v1/admin/export/requests?${params}`, filename);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Excel indirilemedi");
    } finally {
      setExporting(false);
    }
  }

  async function loadVisual() {
    const params = new URLSearchParams({ detail: "true", limit: "500" });
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
    const params = new URLSearchParams({ limit: "500", scope: "product" });
    if (status) params.set("status", status);
    if (storeId) params.set("storeId", storeId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
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

  useEffect(() => {
    loadSizeSummary();
  }, [status, storeId, targetType, dateFrom, dateTo]);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Talepler</h1>
          <p className="text-muted-foreground">Görsel değişim ve ürün talepleri — indirme, silme, ölçü özeti</p>
        </div>
        <Button onClick={downloadRequestsExcel} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          {exporting
            ? "Hazırlanıyor..."
            : tab === "catalog"
              ? "Ürün taleplerini indir (Excel)"
              : tab === "visual"
                ? "Görsel talepleri indir (Excel)"
                : "Tüm talepleri indir (Excel)"}
        </Button>
      </div>
      {exportError ? <p className="text-sm text-destructive">{exportError}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button variant={tab === "visual" ? "default" : "outline"} onClick={() => setTab("visual")}>
          Görsel Değişim
        </Button>
        <Button variant={tab === "catalog" ? "default" : "outline"} onClick={() => setTab("catalog")}>
          Kampanya / Ürün Talepleri
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
              {CHANGE_TARGET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CHANGE_TARGET_TYPE_LABELS[t]}
                </option>
              ))}
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

      {tab === "catalog" && productTotals.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 font-semibold">Ürün Toplamları</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">Kampanya</th>
                    <th className="py-2 pr-3">Kategori</th>
                    <th className="py-2 pr-3">Ürün</th>
                    <th className="py-2 pr-3">Adet</th>
                    <th className="py-2">Kayıt</th>
                  </tr>
                </thead>
                <tbody>
                  {productTotals.map((row) => (
                    <tr key={`${row.campaign}-${row.product}`} className="border-b last:border-0">
                      <td className="py-2 pr-3">{row.campaign || "-"}</td>
                      <td className="py-2 pr-3">{row.category || "-"}</td>
                      <td className="py-2 pr-3">{row.product}</td>
                      <td className="py-2 pr-3 font-medium">{row.adet}</td>
                      <td className="py-2">{row.kayit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "visual" && (
      <SizeSummaryPanel
        title="Ölçü Özeti (görsel talepler)"
        groups={sizeGroups}
        loading={sizeLoading}
      />
      )}

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
                            <div className="text-sm text-muted-foreground">
                              {changeTargetTypeLabel(req.targetType)}
                            </div>
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
                              deleteOne(req.id, `${req.store.name} · ${target?.summary ?? changeTargetTypeLabel(req.targetType)}`)
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
                            {req.campaign?.name ? `${req.campaign.name} · ` : ""}
                            {req.catalogItem.category?.name ? `${req.catalogItem.category.name} · ` : ""}
                            {req.quantity ? `${req.quantity} adet · ` : ""}
                            {formatDate(req.createdAt)}
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
