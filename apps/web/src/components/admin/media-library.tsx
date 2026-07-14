"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, SkeletonGrid } from "@/components/page-header";
import { useIsStrictAdmin } from "@/lib/role-context";
import {
  MEDIA_CATEGORIES,
  MEDIA_CATEGORY_LABELS,
  thumbUrl,
  type MediaCategory,
  type PaginatedResponse,
} from "@magaza/shared";

type MediaItem = {
  id: string;
  url: string;
  filename: string;
  category: MediaCategory;
  sourceRef?: string | null;
  createdAt: string;
  store?: { id: string; name: string } | null;
  createdBy?: { id: string; username: string } | null;
};

export function MediaLibraryManager() {
  const isAdmin = useIsStrictAdmin();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [category, setCategory] = useState<string>("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load(p = 1, append = false) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "24" });
    if (category) params.set("category", category);
    const res = await fetch(`/api/v1/admin/media?${params}`);
    const data: PaginatedResponse<MediaItem> = await res.json();
    setItems((prev) => (append ? [...prev, ...data.items] : data.items));
    setHasMore(data.hasMore);
    setPage(data.page);
    setLoading(false);
  }

  useEffect(() => {
    load(1);
  }, [category]);

  async function remove(id: string) {
    if (!isAdmin || !confirm("Görsel kalıcı olarak silinsin mi?")) return;
    const res = await fetch(`/api/v1/admin/media/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Silinemedi");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Görsel Kütüphanesi" subtitle="Yükleme kaynağına göre kategorize edilmiş görseller" />

      <section className="panel-section">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={category === "" ? "default" : "outline"} onClick={() => setCategory("")}>
            Tümü
          </Button>
          {MEDIA_CATEGORIES.map((c) => (
            <Button key={c} size="sm" variant={category === c ? "default" : "outline"} onClick={() => setCategory(c)}>
              {MEDIA_CATEGORY_LABELS[c]}
            </Button>
          ))}
        </div>
      </section>

      {loading && items.length === 0 ? (
        <SkeletonGrid count={8} />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          Bu kategoride görsel yok. Yeni yüklemeler otomatik buraya düşer.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="relative aspect-square bg-muted">
                <Image src={thumbUrl(item.url) ?? item.url} alt="" fill className="object-cover" sizes="25vw" unoptimized />
              </div>
              <CardContent className="space-y-2 p-3">
                <Badge variant="secondary" className="text-xs">
                  {MEDIA_CATEGORY_LABELS[item.category]}
                </Badge>
                <div className="text-xs text-muted-foreground">
                  {item.store?.name ?? "Mağaza yok"} · {item.createdBy?.username ?? "-"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString("tr-TR")}
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <a href={item.url} target="_blank" rel="noreferrer">
                      Aç
                    </a>
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" onClick={() => remove(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => load(page + 1, true)} disabled={loading}>
            {loading ? "Yükleniyor..." : "Daha fazla"}
          </Button>
        </div>
      )}
    </div>
  );
}
