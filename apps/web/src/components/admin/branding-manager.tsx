"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BrandingResponse = {
  logoUrl: string | null;
  updatedAt: string | null;
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
      setSuccess("Logo güncellendi. Ana ekran ve bildirim ikonları birkaç dakika içinde yenilenir.");
      setFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  const currentIcon = data?.logoUrl ?? "/api/v1/branding/icon/192";

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
                  src={`${currentIcon}?t=${data?.updatedAt ?? ""}`}
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
              </div>
            </div>
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
