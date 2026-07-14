"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type ReleaseInfo = {
  platform: "ANDROID" | "IOS";
  version: string;
  buildNumber: number;
  fileName: string;
  fileSize: number;
  updatedAt: string;
  releaseNotes?: string | null;
  installLink?: string;
};

type MobileAppResponse = {
  android: ReleaseInfo | null;
  ios: ReleaseInfo | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MobileAppManager() {
  const [data, setData] = useState<MobileAppResponse | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/v1/admin/mobile-app")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Yüklenemedi");
        setData(json);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"));
  }, []);

  function copyInstallLink(link: string) {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const android = data?.android;
  const ios = data?.ios;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Mobil Uygulama İndir</h1>
        <p className="text-muted-foreground">
          Güncel APK ve Ad Hoc IPA dosyalarını indirip mağaza veya müdürlere gönderin. App Store / Play Store gerekmez.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Android (APK)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {android ? (
              <>
                <div className="text-sm">
                  <div><strong>Sürüm:</strong> {android.version} (build {android.buildNumber})</div>
                  <div><strong>Dosya:</strong> {android.fileName} · {formatBytes(android.fileSize)}</div>
                  <div><strong>Güncelleme:</strong> {formatDate(android.updatedAt)}</div>
                </div>
                <Button asChild>
                  <a href="/api/v1/admin/mobile-app/download?platform=ANDROID">APK İndir</a>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                APK henüz hazır değil. Build sonrası sunucuya yayınlanır.
              </p>
            )}
            <div className="rounded-xl bg-secondary/50 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Kurulum (Android)</p>
              <ol className="mt-2 list-inside list-decimal space-y-1">
                <li>APK dosyasını telefona gönderin</li>
                <li>Dosyayı açın ve yüklemeye izin verin</li>
                <li>Gerekirse bilinmeyen kaynaklardan yüklemeye izin verin</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>iOS (Ad Hoc IPA)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ios ? (
              <>
                <div className="text-sm">
                  <div><strong>Sürüm:</strong> {ios.version} (build {ios.buildNumber})</div>
                  <div><strong>Dosya:</strong> {ios.fileName} · {formatBytes(ios.fileSize)}</div>
                  <div><strong>Güncelleme:</strong> {formatDate(ios.updatedAt)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <a href="/api/v1/admin/mobile-app/download?platform=IOS">IPA İndir</a>
                  </Button>
                  {ios.installLink && (
                    <Button variant="outline" onClick={() => copyInstallLink(ios.installLink!)}>
                      {copied ? "Kopyalandı" : "iPhone Kurulum Linki"}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                IPA henüz hazır değil. Build sonrası sunucuya yayınlanır.
              </p>
            )}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">iOS notu (Ad Hoc)</p>
              <p className="mt-1">
                IPA yalnızca build sırasında Apple Developer hesabınıza kayıtlı cihazlarda çalışır.
                Yeni telefon eklendiğinde cihazı Apple&apos;a kaydedip yeniden build almanız gerekir.
              </p>
              <p className="mt-2 font-medium">Kurulum</p>
              <ol className="mt-1 list-inside list-decimal space-y-1">
                <li>IPA dosyasını gönderin veya kurulum linkini Safari&apos;de açın</li>
                <li>Ayarlar → Genel → VPN ve Cihaz Yönetimi → Güven</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
