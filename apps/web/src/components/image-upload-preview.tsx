"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
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
  const inputId = useId();
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

  const pickLabel = file
    ? "Başka dosya seç"
    : existingUrl
      ? "Görseli değiştir"
      : "Dosya seç";

  return (
    <div className="space-y-3">
      <Label htmlFor={inputId}>
        {label}
        {required ? " *" : ""}
      </Label>
      {replaceHint && existingUrl && !file && (
        <p className="text-xs text-muted-foreground">
          İlk yüklenen görseli değiştirmek için &quot;Görseli değiştir&quot;e tıklayın.
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
          <label htmlFor={inputId} className="cursor-pointer">
            {pickLabel}
          </label>
        </Button>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="sr-only"
          onChange={(e) => {
            const selected = e.target.files?.[0] ?? null;
            onFileChange(selected);
            // aynı dosyayı tekrar seçebilsin
            e.target.value = "";
          }}
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
