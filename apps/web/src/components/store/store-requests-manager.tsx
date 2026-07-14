"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";
import {
  canStoreUploadImage,
  type ChangeRequestStatus,
} from "@magaza/shared";

type Request = {
  id: string;
  targetType: string;
  targetId: string;
  status: ChangeRequestStatus;
  note?: string | null;
  createdAt: string;
};

export function StoreRequestsManager() {
  const [requests, setRequests] = useState<Request[]>([]);

  async function load() {
    const res = await fetch("/api/v1/change-requests");
    const data = await res.json();
    setRequests(Array.isArray(data) ? data : data.items ?? []);
  }

  useEffect(() => { load(); }, []);

  async function uploadImage(id: string) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/v1/change-requests/${id}/upload-image`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        alert("Görsel yüklenemedi");
        return;
      }
      alert("Görsel yüklendi, müdür onayı bekleniyor");
      load();
    };
    input.click();
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
                <div className="font-medium">{req.targetType}</div>
                <div className="text-sm text-muted-foreground">{formatDate(req.createdAt)}</div>
                {req.note && <p className="mt-1 text-sm">{req.note}</p>}
                {req.status === "GUNCELLEME_YUKLENDI" && (
                  <p className="mt-2 text-sm text-amber-700">Müdür onayı bekleniyor</p>
                )}
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <StatusBadge status={req.status} />
                {canStoreUploadImage(req.status) && (
                  <Button size="sm" onClick={() => uploadImage(req.id)}>
                    Görseli Değiştir
                  </Button>
                )}
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
