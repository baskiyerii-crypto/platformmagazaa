"use client";

import { useEffect, useState } from "react";
import { Camera, ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";
import {
  canStoreDeleteChangeRequest,
  canStoreUploadImage,
  changeTargetTypeLabel,
  type ChangeRequestStatus,
} from "@magaza/shared";
import { normalizeImageFile } from "@/lib/normalize-image-file";

type Request = {
  id: string;
  targetType: string;
  targetId: string;
  status: ChangeRequestStatus;
  note?: string | null;
  createdAt: string;
};

function pickImage(mode: "camera" | "gallery"): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.heic,.heif,.HEIC,.HEIF";
    if (mode === "camera") {
      input.setAttribute("capture", "environment");
    }
    input.onchange = () => {
      resolve(input.files?.[0] ?? null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export function StoreRequestsManager() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/v1/change-requests");
    const data = await res.json();
    setRequests(Array.isArray(data) ? data : data.items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function uploadImage(id: string, mode: "camera" | "gallery") {
    const picked = await pickImage(mode);
    if (!picked) return;
    setUploadingId(id);
    try {
      let file: File;
      try {
        file = await normalizeImageFile(picked);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Görsel işlenemedi");
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/v1/change-requests/${id}/upload-image`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.error ?? "Görsel yüklenemedi");
        return;
      }
      alert("Görsel yüklendi, müdür onayı bekleniyor");
      await load();
    } finally {
      setUploadingId(null);
    }
  }

  async function deleteRequest(id: string) {
    if (!confirm("Talep silinsin mi?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/v1/change-requests/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.error ?? "Talep silinemedi");
        return;
      }
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Taleplerim</h1>
        <p className="text-muted-foreground">Değişim taleplerinizi takip edin</p>
      </div>

      <div className="space-y-4">
        {requests.map((req) => (
          <Card key={req.id}>
            <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium">{changeTargetTypeLabel(req.targetType)}</div>
                <div className="text-sm text-muted-foreground">{formatDate(req.createdAt)}</div>
                {req.note && <p className="mt-1 text-sm">{req.note}</p>}
                {req.status === "GUNCELLEME_YUKLENDI" && (
                  <p className="mt-2 text-sm text-amber-700">Müdür onayı bekleniyor</p>
                )}
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <StatusBadge status={req.status} />
                <div className="flex flex-wrap gap-2">
                  {canStoreUploadImage(req.status) && (
                    <>
                      <Button
                        size="sm"
                        disabled={uploadingId === req.id || deletingId === req.id}
                        onClick={() => void uploadImage(req.id, "camera")}
                      >
                        <Camera className="mr-1.5 h-4 w-4" />
                        Fotoğraf çek
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={uploadingId === req.id || deletingId === req.id}
                        onClick={() => void uploadImage(req.id, "gallery")}
                      >
                        <ImageIcon className="mr-1.5 h-4 w-4" />
                        Galeriden seç
                      </Button>
                    </>
                  )}
                  {canStoreDeleteChangeRequest(req.status) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deletingId === req.id || uploadingId === req.id}
                      onClick={() => void deleteRequest(req.id)}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      {deletingId === req.id ? "Siliniyor..." : "Talebi sil"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!requests.length && (
          <p className="text-sm text-muted-foreground">Henüz talep yok</p>
        )}
      </div>
    </div>
  );
}
