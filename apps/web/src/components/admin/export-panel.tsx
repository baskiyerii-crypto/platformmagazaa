"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSlimStores } from "@/lib/stores-cache";
import { downloadExcelBlob } from "@/lib/download-excel";

type Store = { id: string; name: string };

export function ExportPanel() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storesError, setStoresError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState("");
  const [busy, setBusy] = useState<"detail" | "inventory" | "requests" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSize, setLastSize] = useState<number | null>(null);

  useEffect(() => {
    fetchSlimStores()
      .then((list) => {
        if (!Array.isArray(list)) {
          setStores([]);
          setStoresError("Mağaza listesi alınamadı");
          return;
        }
        setStores(list);
        setStoresError(null);
      })
      .catch(() => {
        setStores([]);
        setStoresError("Mağaza listesi alınamadı");
      });
  }, []);

  async function runDownload(
    kind: "detail" | "inventory" | "requests",
    url: string,
    filename: string
  ) {
    setBusy(kind);
    setError(null);
    setLastSize(null);
    try {
      const size = await downloadExcelBlob(url, filename);
      setLastSize(size);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Excel indirilemedi");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Excel Export</h1>
        <p className="text-muted-foreground">Detaylı mağaza, envanter ve kampanya talep raporları</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Mağaza seçimi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
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
          {storesError ? <p className="text-sm text-destructive">{storesError}</p> : null}
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Detaylı Mağaza Raporu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() =>
              runDownload(
                "detail",
                storeId
                  ? `/api/v1/admin/export/excel?storeId=${encodeURIComponent(storeId)}`
                  : "/api/v1/admin/export/excel",
                storeId
                  ? `magaza-export-${storeId}.xlsx`
                  : `magaza-export-${new Date().toISOString().slice(0, 10)}.xlsx`
              )
            }
            disabled={busy !== null}
          >
            <Download className="mr-2 h-4 w-4" />
            {busy === "detail" ? "Hazırlanıyor..." : "Detaylı Excel İndir"}
          </Button>
          <p className="text-sm text-muted-foreground">
            AVM, Açık Hava, Mağaza İçi, Görsel Talepler, Kampanya Talepleri, Özet ve Ölçü Özeti.
          </p>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Envanter Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="secondary"
            onClick={() => {
              const p = new URLSearchParams({ format: "excel" });
              if (storeId) p.set("storeId", storeId);
              return runDownload(
                "inventory",
                `/api/v1/admin/export/inventory?${p.toString()}`,
                `envanter-${new Date().toISOString().slice(0, 10)}.xlsx`
              );
            }}
            disabled={busy !== null}
          >
            <Download className="mr-2 h-4 w-4" />
            {busy === "inventory" ? "Hazırlanıyor..." : "Envanter Excel İndir"}
          </Button>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Kampanya / Talepler Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={() => {
              const p = new URLSearchParams({ format: "excel", tab: "all" });
              if (storeId) p.set("storeId", storeId);
              return runDownload(
                "requests",
                `/api/v1/admin/export/requests?${p.toString()}`,
                `talepler-${new Date().toISOString().slice(0, 10)}.xlsx`
              );
            }}
            disabled={busy !== null}
          >
            <Download className="mr-2 h-4 w-4" />
            {busy === "requests" ? "Hazırlanıyor..." : "Talepler Excel İndir"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Görsel talepler + mağaza ürün adetleri + ürün toplamları. Daha fazla filtre için{" "}
            <Link href="/admin/requests" className="font-medium text-primary hover:underline">
              Talepler
            </Link>{" "}
            sayfasını kullanın.
          </p>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {lastSize != null && !error ? (
        <p className="text-sm text-muted-foreground">
          İndirildi · {(lastSize / 1024).toFixed(1)} KB — Excel içindeki <strong>Özet</strong> /
          <strong> Rapor Bilgisi</strong> sayfasına bakın.
        </p>
      ) : null}

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Reklam Giderleri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Kampanya / özel gider raporları için{" "}
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
