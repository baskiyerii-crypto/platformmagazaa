"use client";

import { useEffect, useState } from "react";
import { useIsStrictAdmin } from "@/lib/role-context";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import {
  SIGNUP_REQUEST_STATUS_LABELS,
  type PaginatedResponse,
  type SignupRequestStatus,
} from "@magaza/shared";

type Signup = {
  id: string;
  storeName: string;
  storeNumber: string;
  username: string;
  status: SignupRequestStatus;
  adminNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
};

export function RegistrationsManager() {
  const isAdmin = useIsStrictAdmin();
  const [items, setItems] = useState<Signup[]>([]);
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "ALL">("PENDING");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/v1/admin/registrations?status=${statusFilter}&limit=100`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Liste alınamadı");
      }
      const data: PaginatedResponse<Signup> = await res.json();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function review(id: string, action: "APPROVE" | "REJECT") {
    if (!isAdmin) return;
    const note =
      action === "REJECT" ? prompt("Red notu (opsiyonel):") : null;
    if (action === "REJECT" && note === null) return;
    if (action === "APPROVE" && !confirm("Bu kayıt onaylansın mı? Mağaza ve kullanıcı oluşturulacak.")) {
      return;
    }

    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/v1/admin/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminNote: note?.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "İşlem başarısız");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kayıt Talepleri"
        subtitle="Mağaza kayıt başvurularını onaylayın veya reddedin"
      />

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={statusFilter === "PENDING" ? "default" : "outline"}
          onClick={() => setStatusFilter("PENDING")}
        >
          Bekleyen
        </Button>
        <Button
          size="sm"
          variant={statusFilter === "ALL" ? "default" : "outline"}
          onClick={() => setStatusFilter("ALL")}
        >
          Tümü
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}

      {!loading && items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Kayıt talebi yok.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{item.storeName}</h3>
                  <Badge variant="outline">No: {item.storeNumber}</Badge>
                  <Badge
                    variant={
                      item.status === "PENDING"
                        ? "secondary"
                        : item.status === "APPROVED"
                          ? "default"
                          : "destructive"
                    }
                  >
                    {SIGNUP_REQUEST_STATUS_LABELS[item.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Kullanıcı: {item.username} ·{" "}
                  {new Date(item.createdAt).toLocaleString("tr-TR")}
                </p>
                {item.adminNote ? (
                  <p className="mt-1 text-sm">Not: {item.adminNote}</p>
                ) : null}
              </div>
              {isAdmin && item.status === "PENDING" ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === item.id}
                    onClick={() => review(item.id, "APPROVE")}
                  >
                    <Check className="mr-1.5 h-4 w-4" />
                    Onayla
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busyId === item.id}
                    onClick={() => review(item.id, "REJECT")}
                  >
                    <X className="mr-1.5 h-4 w-4" />
                    Reddet
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
