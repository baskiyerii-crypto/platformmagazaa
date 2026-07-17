"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dispatchBrandingUpdated } from "@/lib/branding-events";

type BrandingResponse = {
  logoUrl: string | null;
  updatedAt: string | null;
  fileExists?: boolean;
};

export function BrandingManager() {
  const [data, setData] = useState<BrandingResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const res = await fetch("/api/v1/admin/branding/logo");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Yüklenemedi");
    setData(json);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"));
  }, []);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Lütfen bir logo dosyası seçin");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/v1/admin/branding/logo", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Yüklenemedi");
      setSuccess("Logo güncellendi. Sekme ikonu ve önizleme anında yenilenir.");
      setFile(null);
      await load();
      dispatchBrandingUpdated({
        logoUrl: json.logoUrl ?? null,
        updatedAt: json.updatedAt ?? new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  // Always render via icon API so disk-backed logo + defaults both work with cache-bust
  const currentIcon = `/api/v1/branding/icon/192`;
  const iconSrc = `${currentIcon}?t=${encodeURIComponent(data?.updatedAt ?? "default")}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Uygulama Logosu</h1>
        <p className="text-muted-foreground">
          WhatsApp linkinden açılan web uygulamasının ana ekran ikonu ve bildirim görseli buradan yönetilir.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mevcut logo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl border bg-muted">
                <Image
                  src={iconSrc}
                  alt="Uygulama logosu"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <div>Ana ekran ikonu</div>
                <div>Bildirim ikonu</div>
                <div>PWA başlık görseli</div>
                {data?.logoUrl ? (
                  <div className="mt-1 text-xs text-emerald-700">Özel logo yüklü</div>
                ) : (
                  <div className="mt-1 text-xs">Varsayılan ikon (logo yüklenmemiş)</div>
                )}
              </div>
            </div>
            {data?.logoUrl && data.fileExists === false && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Logo kaydı var ancak dosya diskte bulunamadı. Coolify&apos;da /app/uploads kalıcı depolamayı
                kontrol edip logoyu yeniden yükleyin.
              </p>
            )}
            {data?.updatedAt && (
              <p className="text-xs text-muted-foreground">
                Son güncelleme: {new Date(data.updatedAt).toLocaleString("tr-TR")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yeni logo yükle</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo-file">Logo dosyası (JPG, PNG, WebP)</Label>
                <Input
                  id="logo-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              {preview && (
                <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-2xl border">
                  <Image src={preview} alt="Önizleme" fill className="object-cover" unoptimized />
                </div>
              )}
              <Button type="submit" disabled={loading || !file}>
                {loading ? "Yükleniyor..." : "Logoyu kaydet"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
