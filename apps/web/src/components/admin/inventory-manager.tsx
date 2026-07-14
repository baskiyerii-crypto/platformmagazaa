"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Plus, Download, FileSpreadsheet, FileText, LayoutGrid, List } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, SkeletonGrid } from "@/components/page-header";
import { ClickableThumbnail, ImageLightbox } from "@/components/image-lightbox";
import { queryKeys } from "@/lib/query-keys";
import { CHANGE_REQUEST_STATUS_LABELS, thumbUrl, type PaginatedResponse, type ChangeRequestStatus } from "@magaza/shared";

const AvmManager = dynamic(
  () => import("@/components/store/avm-manager").then((m) => ({ default: m.AvmManager })),
  { ssr: false, loading: () => <div className="h-32 animate-pulse rounded-lg bg-muted" /> }
);

const OutdoorManager = dynamic(
  () => import("@/components/store/outdoor-manager").then((m) => ({ default: m.OutdoorManager })),
  { ssr: false, loading: () => <div className="h-32 animate-pulse rounded-lg bg-muted" /> }
);

const SignageManager = dynamic(
  () => import("@/components/store/signage-manager").then((m) => ({ default: m.SignageManager })),
  { ssr: false, loading: () => <div className="h-32 animate-pulse rounded-lg bg-muted" /> }
);

type InventoryItem = {
  id: string;
  type: string;
  label: string;
  store: { id: string; name: string };
  en?: number;
  boy?: number;
  gorselUrl?: string | null;
  storeImageUrl?: string | null;
  referenceImageUrl?: string | null;
  status?: ChangeRequestStatus;
};

type Store = { id: string; name: string };

const TYPE_LABELS: Record<string, string> = {
  AVM_VITRIN: "AVM Vitrin",
  OUTDOOR: "Açık Hava",
  STORE_SIGNAGE: "Mağaza İçi",
  CATALOG_REQUEST: "Ürün Talebi",
};

type Props = {
  initialInventory?: PaginatedResponse<InventoryItem>;
  initialStores?: Store[];
  defaultType?: string;
};

async function fetchInventory(filters: {
  storeId: string;
  type: string;
  search: string;
  page: number;
}) {
  const params = new URLSearchParams({ page: String(filters.page), limit: "24" });
  if (filters.storeId) params.set("storeId", filters.storeId);
  if (filters.type) params.set("type", filters.type);
  if (filters.search) params.set("search", filters.search);
  const res = await fetch(`/api/v1/admin/inventory?${params}`);
  return res.json() as Promise<PaginatedResponse<InventoryItem>>;
}

function groupItemsByStore(items: InventoryItem[]) {
  const groups = new Map<string, { store: Store; items: InventoryItem[] }>();
  for (const item of items) {
    const existing = groups.get(item.store.id);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(item.store.id, { store: item.store, items: [item] });
    }
  }
  return [...groups.values()].sort((a, b) =>
    a.store.name.localeCompare(b.store.name, "tr")
  );
}

function InventoryListRow({
  item,
  onImageClick,
}: {
  item: InventoryItem;
  onImageClick: (src: string, title: string) => void;
}) {
  const imageUrl = item.gorselUrl ?? item.storeImageUrl ?? item.referenceImageUrl;

  return (
    <li className="flex gap-4 border-t px-4 py-3 first:border-t-0">
      <div className="shrink-0">
        {imageUrl ? (
          <ClickableThumbnail
            src={thumbUrl(imageUrl) ?? imageUrl}
            alt={item.label}
            onClick={() => onImageClick(imageUrl, item.label)}
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-xl border bg-muted text-xs text-muted-foreground">
            Görsel yok
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium leading-snug">{item.label}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {TYPE_LABELS[item.type] ?? item.type.replace(/_/g, " ")}
          </Badge>
          {item.en && item.boy && (
            <span className="text-xs text-muted-foreground">{item.en}×{item.boy} cm</span>
          )}
          {item.status && (
            <span className="text-xs text-muted-foreground">
              {CHANGE_REQUEST_STATUS_LABELS[item.status]}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

export function InventoryManager({ initialInventory, initialStores, defaultType = "" }: Props) {
  const queryClient = useQueryClient();
  const [storeId, setStoreId] = useState("");
  const [addStoreId, setAddStoreId] = useState(initialStores?.[0]?.id ?? "");
  const [type, setType] = useState(defaultType);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [extraItems, setExtraItems] = useState<InventoryItem[]>([]);
  const [hasMore, setHasMore] = useState(initialInventory?.hasMore ?? false);
  const [addMode, setAddMode] = useState<"" | "avm" | "outdoor" | "signage">("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);

  function buildExportUrl(format: "excel" | "pdf") {
    const params = new URLSearchParams({ format });
    if (storeId) params.set("storeId", storeId);
    if (type) params.set("type", type);
    if (search.trim()) params.set("search", search.trim());
    return `/api/v1/admin/export/inventory?${params}`;
  }

  function downloadExport(format: "excel" | "pdf") {
    window.open(buildExportUrl(format), "_blank");
  }

  const { data: stores = [] } = useQuery({
    queryKey: queryKeys.stores.slim,
    queryFn: () => fetch("/api/v1/admin/stores?slim=1").then((r) => r.json()) as Promise<Store[]>,
    initialData: initialStores,
    staleTime: 120_000,
  });

  useEffect(() => {
    if (stores[0] && !addStoreId) setAddStoreId(stores[0].id);
  }, [stores, addStoreId]);

  const filters = { storeId, type, search, page: 1 };
  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.inventory(filters),
    queryFn: () => fetchInventory(filters),
    initialData: page === 1 && !storeId && type === defaultType && !search ? initialInventory : undefined,
    staleTime: 30_000,
  });

  useEffect(() => {
    setPage(1);
    setExtraItems([]);
    if (data) setHasMore(data.hasMore);
  }, [storeId, type, search, data?.hasMore]);

  const items = [...(data?.items ?? []), ...extraItems];
  const loading = (isLoading || isFetching) && items.length === 0;
  const storeGroups = useMemo(() => groupItemsByStore(items), [items]);

  function openImage(src: string, title: string) {
    setLightbox({ src, title });
  }

  async function loadMore() {
    const nextPage = page + 1;
    const more = await fetchInventory({ storeId, type, search, page: nextPage });
    setExtraItems((prev) => [...prev, ...more.items]);
    setPage(nextPage);
    setHasMore(more.hasMore);
  }

  function img(item: InventoryItem) {
    return item.gorselUrl ?? item.storeImageUrl ?? item.referenceImageUrl;
  }

  function onInventoryAdded() {
    setAddMode("");
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
  }

  const addStoreName = stores.find((s) => s.id === addStoreId)?.name;

  return (
    <div className="space-y-6">
      <PageHeader title="Envanter" subtitle="Mağazalara göre gruplanmış envanter kayıtları" />

      <section className="panel-section space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Yeni Kayıt Ekle</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-1">
            <Label className="text-xs text-muted-foreground">Mağaza</Label>
            <select className="field-select" value={addStoreId} onChange={(e) => setAddStoreId(e.target.value)}>
              <option value="">Seçin...</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
            <Button
              size="sm"
              variant={addMode === "avm" ? "default" : "outline"}
              disabled={!addStoreId}
              onClick={() => setAddMode(addMode === "avm" ? "" : "avm")}
            >
              AVM
            </Button>
            <Button
              size="sm"
              variant={addMode === "outdoor" ? "default" : "outline"}
              disabled={!addStoreId}
              onClick={() => setAddMode(addMode === "outdoor" ? "" : "outdoor")}
            >
              Açık Hava
            </Button>
            <Button
              size="sm"
              variant={addMode === "signage" ? "default" : "outline"}
              disabled={!addStoreId}
              onClick={() => setAddMode(addMode === "signage" ? "" : "signage")}
            >
              Mağaza İçi
            </Button>
          </div>
        </div>
      </section>

      {addMode === "avm" && addStoreId && (
        <AvmManager storeId={addStoreId} adminMode formOnly onSuccess={onInventoryAdded} storeName={addStoreName} />
      )}
      {addMode === "outdoor" && addStoreId && (
        <OutdoorManager storeId={addStoreId} adminMode formOnly onSuccess={onInventoryAdded} storeName={addStoreName} />
      )}
      {addMode === "signage" && addStoreId && (
        <SignageManager storeId={addStoreId} adminMode formOnly onSuccess={onInventoryAdded} storeName={addStoreName} />
      )}

      <section className="panel-section space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Kayıtları Filtrele</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
            >
              <List className="mr-1 h-4 w-4" /> Liste
            </Button>
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "outline"}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="mr-1 h-4 w-4" /> Kart
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Mağaza</Label>
            <select className="field-select" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              <option value="">Tümü</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tür</Label>
            <select className="field-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Tümü</option>
              <option value="AVM_VITRIN">AVM Vitrin</option>
              <option value="OUTDOOR">Açık Hava</option>
              <option value="STORE_SIGNAGE">Mağaza İçi</option>
              <option value="CATALOG_REQUEST">Ürün Talebi</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Ara</Label>
            <div className="flex gap-2">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Mağaza veya ürün adı" />
              <Button variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.inventory(filters) })}>
                Ara
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Download className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Toplu İndir (aktif filtreler)</span>
          <Button size="sm" variant="outline" onClick={() => downloadExport("excel")}>
            <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel (Görselli)
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadExport("pdf")}>
            <FileText className="mr-1 h-4 w-4" /> PDF (Görselli)
          </Button>
          {data?.total != null && (
            <span className="text-xs text-muted-foreground">{data.total} kayıt eşleşiyor</span>
          )}
        </div>
      </section>

      {loading ? (
        <SkeletonGrid count={6} />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          Kayıt bulunamadı
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-6">
          {storeGroups.map(({ store, items: storeItems }) => (
            <section key={store.id} className="overflow-hidden rounded-xl border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link href={`/admin/stores/${store.id}`} className="font-semibold text-primary hover:underline">
                    {store.name}
                  </Link>
                  <Badge variant="secondary">{storeItems.length} kayıt</Badge>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/admin/stores/${store.id}`}>Mağaza detayı</Link>
                </Button>
              </div>
              <ul>
                {storeItems.map((item) => (
                  <InventoryListRow
                    key={`${item.type}-${item.id}`}
                    item={item}
                    onImageClick={openImage}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const imageUrl = img(item);
            return (
            <Card key={`${item.type}-${item.id}`} className="overflow-hidden transition-shadow hover:shadow-md">
              {imageUrl && (
                <button
                  type="button"
                  className="relative block aspect-[4/3] w-full bg-muted"
                  onClick={() => openImage(imageUrl, item.label)}
                >
                  <Image src={thumbUrl(imageUrl) ?? imageUrl} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 33vw" unoptimized />
                </button>
              )}
              <CardContent className="space-y-2 p-4">
                <div className="line-clamp-2 text-sm font-medium leading-snug">{item.label}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{TYPE_LABELS[item.type] ?? item.type}</Badge>
                  {item.en && item.boy && <span className="text-xs text-muted-foreground">{item.en}×{item.boy} cm</span>}
                </div>
                {item.status && <div className="text-xs text-muted-foreground">{CHANGE_REQUEST_STATUS_LABELS[item.status]}</div>}
                <Link href={`/admin/stores/${item.store.id}`} className="inline-block text-xs font-medium text-primary hover:underline">
                  {item.store.name}
                </Link>
              </CardContent>
            </Card>
          );
          })}
        </div>
      )}

      {lightbox && (
        <ImageLightbox
          open
          onOpenChange={(open) => !open && setLightbox(null)}
          src={lightbox.src}
          title={lightbox.title}
        />
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={isFetching}>
            {isFetching ? "Yükleniyor..." : "Daha fazla"}
          </Button>
        </div>
      )}
    </div>
  );
}
