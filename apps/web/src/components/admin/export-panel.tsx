"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { fetchSlimStores } from "@/lib/stores-cache";

type Store = { id: string; name: string };

export function ExportPanel() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSlimStores().then(setStores);
  }, []);

  async function downloadExcel() {
    setDownloading(true);
    setError(null);
    try {
      const url = storeId
        ? `/api/v1/admin/export/excel?storeId=${encodeURIComponent(storeId)}`
        : "/api/v1/admin/export/excel";
      const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      const contentType = res.headers.get("content-type") ?? "";

      if (!res.ok) {
        let message = `İndirme başarısız (${res.status})`;
        if (contentType.includes("application/json")) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          if (body?.error) message = body.error;
        }
        throw new Error(message);
      }

      if (!contentType.includes("spreadsheet") && !contentType.includes("octet-stream")) {
        throw new Error("Sunucu Excel dosyası döndürmedi");
      }

      const blob = await res.blob();
      if (blob.size < 64) {
        throw new Error("İndirilen Excel dosyası boş görünüyor");
      }

      const disposition = res.headers.get("content-disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename =
        match?.[1] ??
        (storeId
          ? `magaza-export-${storeId}.xlsx`
          : `magaza-export-${new Date().toISOString().slice(0, 10)}.xlsx`);

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Excel indirilemedi");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Excel Export</h1>
        <p className="text-muted-foreground">Detaylı mağaza raporu ve filtreli envanter indirme</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Detaylı Mağaza Raporu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <select
            className="flex h-10 w-full rounded-xl border px-3 text-sm"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            <option value="">Tüm mağazalar</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button onClick={downloadExcel} disabled={downloading}>
            <Download className="mr-2 h-4 w-4" />
            {downloading ? "Hazırlanıyor..." : "Excel İndir"}
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <p className="text-sm text-muted-foreground">
            Dosyada AVM Ücretsiz, AVM Ücretli, Açık Hava, Mağaza İçi, Talepler ve{" "}
            <strong>Ölçü Özeti</strong> (±3 cm + konum kırılımı) sayfaları bulunur.
          </p>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Reklam Giderleri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Günlük / aylık / yıllık ve kategori filtreli reklam gideri Excel indirme için{" "}
            <Link href="/admin/ad-expenses" className="font-medium text-primary hover:underline">
              Reklam Giderleri
            </Link>{" "}
            sayfasını kullanın.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
