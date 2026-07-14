"use client";

import { useState } from "react";
import { DialogContent, DialogRoot } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: string;
  targetId: string;
  title?: string;
  onSuccess?: () => void;
};

export function ChangeRequestDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  title = "Değişim Talebi",
  onSuccess,
}: Props) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await fetch("/api/v1/change-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, note: note || null }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Talep oluşturulamadı");
      return;
    }
    setNote("");
    onOpenChange(false);
    onSuccess?.();
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Talep Notu (opsiyonel)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ne değişsin?" />
          </div>
          <Button onClick={submit} disabled={loading} className="w-full">
            {loading ? "Gönderiliyor..." : "Talep Oluştur"}
          </Button>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
