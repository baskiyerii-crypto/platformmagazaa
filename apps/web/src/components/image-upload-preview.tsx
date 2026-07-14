"use client";

import { useEffect, useState } from "react";
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
};

export function ImageUploadPreview({
  label = "Görsel",
  existingUrl,
  file,
  onFileChange,
  required,
}: Props) {
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

  return (
    <div className="space-y-3">
      <Label>{label}{required ? " *" : ""}</Label>
      <div className="grid gap-3 sm:grid-cols-2">
        {existingUrl && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Mevcut</p>
            <div className="relative aspect-video overflow-hidden rounded-xl border bg-secondary">
              <Image src={thumbUrl(existingUrl) ?? existingUrl} alt="Mevcut" fill className="object-cover" unoptimized />
            </div>
          </div>
        )}
        {preview && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Önizleme</p>
            <div className="relative aspect-video overflow-hidden rounded-xl border ring-2 ring-primary">
              <Image src={preview} alt="Önizleme" fill className="object-cover" unoptimized />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" asChild>
          <label className="cursor-pointer">
            {file ? "Değiştir" : "Dosya Seç"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
          </label>
        </Button>
        {file && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onFileChange(null)}>
            Kaldır
          </Button>
        )}
      </div>
    </div>
  );
}
