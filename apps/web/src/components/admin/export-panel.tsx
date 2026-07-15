"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { fetchSlimStores } from "@/lib/stores-cache";

type Store = { id: string; name: string };

async function downloadBlob(url: string, fallbackName: string) {
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
  const filename = match?.[1] ?? fallbackName;

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);

  return blob.size;
}

export function ExportPanel() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState("");
  const [busy, setBusy] = useState<"detail" | "inventory" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSize, setLastSize] = useState<number | null>(null);

  useEffect(() => {
    fetchSlimStores().then(setStores);
  }, []);

  async function downloadDetail() {
    setBusy("detail");
    setError(null);
    setLastSize(null);
    try {
      const url = storeId
        ? `/api/v1/admin/export/excel?storeId=${encodeURIComponent(storeId)}`
        : "/api/v1/admin/export/excel";
      const size = await downloadBlob(
        url,
        storeId
          ? `magaza-export-${storeId}.xlsx`
          : `magaza-export-${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      setLastSize(size);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Excel indirilemedi");
    } finally {
      setBusy(null);
    }
  }

  async function downloadInventory() {
    setBusy("inventory");
    setError(null);
    setLastSize(null);
    try {
      const p = new URLSearchParams({ format: "excel" });
      if (storeId) p.set("storeId", storeId);
      const size = await downloadBlob(
        `/api/v1/admin/export/inventory?${p.toString()}`,
        `envanter-${new Date().toISOString().slice(0, 10)}.xlsx`
      );
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
        <p className="text-muted-foreground">Detaylı mağaza raporu ve envanter indirme</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Mağaza seçimi</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Detaylı Mağaza Raporu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={downloadDetail} disabled={busy !== null}>
            <Download className="mr-2 h-4 w-4" />
            {busy === "detail" ? "Hazırlanıyor..." : "Detaylı Excel İndir"}
          </Button>
          <p className="text-sm text-muted-foreground">
            AVM Ücretsiz / Ücretli, Açık Hava, Mağaza İçi, Talepler, <strong>Özet</strong> ve Ölçü
            Özeti sayfaları. Özet sayfasında kaç kayıt yazıldığı görünür.
          </p>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Envanter Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="secondary" onClick={downloadInventory} disabled={busy !== null}>
            <Download className="mr-2 h-4 w-4" />
            {busy === "inventory" ? "Hazırlanıyor..." : "Envanter Excel İndir"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Admin envanter listesiyle aynı kayıtları tek sayfada indirir.
          </p>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {lastSize != null && !error ? (
        <p className="text-sm text-muted-foreground">
          İndirildi · {(lastSize / 1024).toFixed(1)} KB — Excel içindeki <strong>Özet</strong> sayfasına
          bakın; kayıt sayısı 0 ise veritabanında envanter yok demektir.
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
