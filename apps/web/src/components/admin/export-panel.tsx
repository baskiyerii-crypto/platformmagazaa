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
            Dosyada AVM Ücretsiz, AVM Ücretli, Açık Hava, Mağaza İçi ve Talepler sayfaları bulunur (görsel URL metni).
          </p>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Filtreli Envanter (Görselli)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Mağaza, tür ve arama filtresiyle tüm envanteri görselli Excel veya PDF olarak indirmek için{" "}
            <Link href="/admin/inventory" className="font-medium text-primary hover:underline">
              Envanter
            </Link>{" "}
            sayfasındaki &quot;Toplu İndir&quot; butonlarını kullanın.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
