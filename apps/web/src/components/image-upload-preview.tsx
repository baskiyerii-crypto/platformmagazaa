"use client";

import { useEffect, useId, useState } from "react";
import { Camera, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { fullMediaUrl, thumbUrl } from "@magaza/shared";
import { normalizeImageFile } from "@/lib/normalize-image-file";

type Props = {
  label?: string;
  existingUrl?: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  required?: boolean;
  /** Düzenleme: mevcut görselin değiştirilebileceğini vurgula */
  replaceHint?: boolean;
};

export function ImageUploadPreview({
  label = "Görsel",
  existingUrl,
  file,
  onFileChange,
  required,
  replaceHint,
}: Props) {
  const galleryId = useId();
  const cameraId = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!selected) {
      onFileChange(null);
      return;
    }
    setConverting(true);
    try {
      const normalized = await normalizeImageFile(selected);
      onFileChange(normalized);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Görsel işlenemedi");
      onFileChange(null);
    } finally {
      setConverting(false);
    }
  }

  const existingSrc = thumbUrl(existingUrl) ?? fullMediaUrl(existingUrl) ?? existingUrl;

  return (
    <div className="space-y-3">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      {replaceHint && existingUrl && !file && (
        <p className="text-xs text-muted-foreground">
          İlk yüklenen görseli değiştirmek için kamera veya galeri seçin.
        </p>
      )}
      {converting && (
        <p className="text-xs text-primary">Görsel hazırlanıyor (HEIC dönüşümü)…</p>
      )}
      {file && !converting && (
        <p className="text-xs text-primary">
          Yeni görsel seçildi — Kaydet ile mevcut görselin yerine geçer.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {existingUrl && !file && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Mevcut</p>
            <div className="relative aspect-video overflow-hidden rounded-xl border bg-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={existingSrc ?? ""}
                alt="Mevcut"
                className="h-full w-full object-cover"
                onError={(e) => {
                  const full = fullMediaUrl(existingUrl);
                  if (full && e.currentTarget.src !== full) e.currentTarget.src = full;
                }}
              />
            </div>
          </div>
        )}
        {existingUrl && file && (
          <div className="space-y-2 opacity-60">
            <p className="text-xs text-muted-foreground">Eski (değişecek)</p>
            <div className="relative aspect-video overflow-hidden rounded-xl border bg-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={existingSrc ?? ""} alt="Eski" className="h-full w-full object-cover" />
            </div>
          </div>
        )}
        {preview && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Yeni</p>
            <div className="relative aspect-video overflow-hidden rounded-xl border ring-2 ring-primary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Önizleme" className="h-full w-full object-cover" />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" asChild disabled={converting}>
          <label htmlFor={cameraId} className="cursor-pointer">
            <Camera className="mr-1.5 h-4 w-4" />
            Fotoğraf çek
          </label>
        </Button>
        <Button type="button" variant="outline" size="sm" asChild disabled={converting}>
          <label htmlFor={galleryId} className="cursor-pointer">
            <ImageIcon className="mr-1.5 h-4 w-4" />
            {file ? "Başka dosya seç" : existingUrl ? "Galeriden değiştir" : "Galeriden seç"}
          </label>
        </Button>
        <input
          id={cameraId}
          type="file"
          accept="image/*,.heic,.heif,.HEIC,.HEIF"
          capture="environment"
          className="sr-only"
          onChange={(e) => void handlePick(e)}
        />
        <input
          id={galleryId}
          type="file"
          accept="image/*,.heic,.heif,.HEIC,.HEIF,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff"
          className="sr-only"
          onChange={(e) => void handlePick(e)}
        />
        {file && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onFileChange(null)}>
            Seçimi iptal
          </Button>
        )}
      </div>
    </div>
  );
}
