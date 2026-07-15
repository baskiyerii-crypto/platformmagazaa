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

  useEffect(() => {
    fetchSlimStores().then(setStores);
  }, []);

  function downloadExcel() {
    const url = storeId
      ? `/api/v1/admin/export/excel?storeId=${storeId}`
      : "/api/v1/admin/export/excel";
    window.open(url, "_blank");
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
          <select className="flex h-10 w-full rounded-xl border px-3 text-sm" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">Tüm mağazalar</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <Button onClick={downloadExcel}>
            <Download className="mr-2 h-4 w-4" /> Excel İndir
          </Button>
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
