"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import { Camera, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { thumbUrl } from "@magaza/shared";

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

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    onFileChange(selected);
    // aynı dosyayı tekrar seçebilsin
    e.target.value = "";
  }

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
      {file && (
        <p className="text-xs text-primary">
          Yeni görsel seçildi — Kaydet ile mevcut görselin yerine geçer.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {existingUrl && !file && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Mevcut</p>
            <div className="relative aspect-video overflow-hidden rounded-xl border bg-secondary">
              <Image
                src={thumbUrl(existingUrl) ?? existingUrl}
                alt="Mevcut"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        )}
        {existingUrl && file && (
          <div className="space-y-2 opacity-60">
            <p className="text-xs text-muted-foreground">Eski (değişecek)</p>
            <div className="relative aspect-video overflow-hidden rounded-xl border bg-secondary">
              <Image
                src={thumbUrl(existingUrl) ?? existingUrl}
                alt="Eski"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        )}
        {preview && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Yeni</p>
            <div className="relative aspect-video overflow-hidden rounded-xl border ring-2 ring-primary">
              <Image src={preview} alt="Önizleme" fill className="object-cover" unoptimized />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" asChild>
          <label htmlFor={cameraId} className="cursor-pointer">
            <Camera className="mr-1.5 h-4 w-4" />
            Fotoğraf çek
          </label>
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <label htmlFor={galleryId} className="cursor-pointer">
            <ImageIcon className="mr-1.5 h-4 w-4" />
            {file ? "Başka dosya seç" : existingUrl ? "Galeriden değiştir" : "Galeriden seç"}
          </label>
        </Button>
        {/* Camera: rear camera on mobile; desktop falls back to file picker */}
        <input
          id={cameraId}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handlePick}
        />
        {/* Gallery / files — no capture so OS shows album chooser */}
        <input
          id={galleryId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="sr-only"
          onChange={handlePick}
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
