"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { fetchSlimStores } from "@/lib/stores-cache";
import { useIsStrictAdmin } from "@/lib/role-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DialogRoot, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  SUPPORT_TICKET_STATUS_LABELS,
  type PaginatedResponse,
  type SupportTicketStatus,
} from "@magaza/shared";

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  adminNote?: string | null;
  store?: { name: string };
  createdAt: string;
};

type TabKey = "OPEN" | "IN_PROGRESS" | "completed";

const TABS: { key: TabKey; label: string }[] = [
  { key: "OPEN", label: "Bekleyen" },
  { key: "IN_PROGRESS", label: "İşlemde" },
  { key: "completed", label: "Tamamlanan" },
];

function ticketMatchesTab(status: SupportTicketStatus, tab: TabKey) {
  if (tab === "OPEN") return status === "OPEN";
  if (tab === "IN_PROGRESS") return status === "IN_PROGRESS";
  return status === "RESOLVED" || status === "CLOSED";
}

export function StoreSupportManager() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/v1/support-tickets");
    const data: PaginatedResponse<Ticket> = await res.json();
    setTickets(data.items);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Gönderilemedi");
      }
      setSubject("");
      setMessage("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gönderilemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Destek" subtitle="Yöneticiye destek talebi gönderin" />
      <Card>
        <CardHeader>
          <CardTitle>Yeni Talep</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="max-w-lg space-y-4">
            <div className="space-y-2">
              <Label>Konu</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Mesaj</Label>
              <textarea
                className="min-h-28 w-full rounded-xl border p-3 text-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={busy}>
              {busy ? "Gönderiliyor..." : "Gönder"}
            </Button>
          </form>
        </CardContent>
      </Card>
      {tickets.map((t) => (
        <Card key={t.id}>
          <CardContent className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-semibold">{t.subject}</div>
              <Badge variant="secondary">{SUPPORT_TICKET_STATUS_LABELS[t.status]}</Badge>
            </div>
            <p className="text-sm">{t.message}</p>
            {t.adminNote ? (
              <p className="rounded-lg bg-secondary p-3 text-sm">Yanıt: {t.adminNote}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminSupportManager() {
  const isAdmin = useIsStrictAdmin();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [storeId, setStoreId] = useState("");
  const [tab, setTab] = useState<TabKey>("OPEN");
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingTicket, setPendingTicket] = useState<Ticket | null>(null);
  const [pendingStatus, setPendingStatus] = useState<SupportTicketStatus | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (storeId) params.set("storeId", storeId);
      const res = await fetch(`/api/v1/admin/support-tickets?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Liste alınamadı");
      }
      const data: PaginatedResponse<Ticket> = await res.json();
      setTickets(data.items);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSlimStores().then(setStores);
  }, []);

  useEffect(() => {
    load();
  }, [storeId]);

  const counts = useMemo(
    () => ({
      OPEN: tickets.filter((t) => t.status === "OPEN").length,
      IN_PROGRESS: tickets.filter((t) => t.status === "IN_PROGRESS").length,
      completed: tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length,
    }),
    [tickets]
  );

  const visible = useMemo(
    () => tickets.filter((t) => ticketMatchesTab(t.status, tab)),
    [tickets, tab]
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    const allSelected = visible.length > 0 && visible.every((t) => selected.has(t.id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const t of visible) next.delete(t.id);
      } else {
        for (const t of visible) next.add(t.id);
      }
      return next;
    });
  }

  async function deleteOne(id: string) {
    if (!isAdmin || !confirm("Bu destek talebi silinsin mi?")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/support-tickets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Silinemedi");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi");
    } finally {
      setDeleting(false);
    }
  }

  async function deleteSelected() {
    if (!isAdmin || selected.size === 0) return;
    if (!confirm(`${selected.size} talep silinsin mi?`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/support-tickets/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Toplu silme başarısız");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toplu silme başarısız");
    } finally {
      setDeleting(false);
    }
  }

  function openStatusDialog(ticket: Ticket, status: SupportTicketStatus) {
    setPendingTicket(ticket);
    setPendingStatus(status);
    setAdminNote(ticket.adminNote ?? "");
    setDialogOpen(true);
  }

  async function confirmStatusUpdate() {
    if (!pendingTicket || !pendingStatus || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/support-tickets/${pendingTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: pendingStatus,
          adminNote: adminNote.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Güncellenemedi");
      }
      setDialogOpen(false);
      setPendingTicket(null);
      setPendingStatus(null);
      await load();
      if (pendingStatus === "IN_PROGRESS") setTab("IN_PROGRESS");
      if (pendingStatus === "RESOLVED" || pendingStatus === "CLOSED") setTab("completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Güncellenemedi");
    } finally {
      setSaving(false);
    }
  }

  async function downloadExcel(scope: "all" | TabKey) {
    setDownloading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (storeId) params.set("storeId", storeId);
      if (scope !== "all") params.set("tab", scope);
      const res = await fetch(`/api/v1/admin/export/support-tickets?${params}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Excel indirilemedi");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `destek-talepleri-${scope}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Excel indirilemedi");
    } finally {
      setDownloading(false);
    }
  }

  const actionsFor = (status: SupportTicketStatus): SupportTicketStatus[] => {
    if (status === "OPEN") return ["IN_PROGRESS", "RESOLVED", "CLOSED"];
    if (status === "IN_PROGRESS") return ["RESOLVED", "CLOSED"];
    if (status === "RESOLVED") return ["CLOSED", "IN_PROGRESS"];
    return ["IN_PROGRESS"];
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Destek Talepleri" subtitle="Mağaza destek istekleri" />

      <div className="flex flex-wrap gap-3">
        <select
          className="h-10 min-w-[12rem] rounded-xl border px-3 text-sm"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
        >
          <option value="">Tüm mağazalar</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={() => downloadExcel(tab)} disabled={downloading}>
          <Download className="mr-2 h-4 w-4" />
          {downloading ? "İndiriliyor..." : "Bu Sekmeyi Excel"}
        </Button>
        <Button onClick={() => downloadExcel("all")} disabled={downloading}>
          <Download className="mr-2 h-4 w-4" />
          Tümünü Excel
        </Button>
        {isAdmin && selected.size > 0 ? (
          <Button variant="destructive" onClick={deleteSelected} disabled={deleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? "Siliniyor..." : `Seçilenleri Sil (${selected.size})`}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? "default" : "outline"}
            onClick={() => setTab(t.key)}
          >
            {t.label} ({counts[t.key]})
          </Button>
        ))}
        {isAdmin && visible.length > 0 ? (
          <Button size="sm" variant="ghost" onClick={toggleSelectAllVisible}>
            {visible.every((t) => selected.has(t.id)) ? "Seçimi kaldır" : "Görünenleri seç"}
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}

      {!loading && !visible.length ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Bu kategoride destek talebi yok.
          </CardContent>
        </Card>
      ) : null}

      {visible.map((t) => (
        <Card key={t.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                {isAdmin ? (
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-input"
                    checked={selected.has(t.id)}
                    onChange={() => toggleSelect(t.id)}
                  />
                ) : null}
                <div>
                  <div className="font-semibold">
                    {t.store?.name} — {t.subject}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(t.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
              </div>
              <Badge>{SUPPORT_TICKET_STATUS_LABELS[t.status]}</Badge>
            </div>
            <p className="text-sm">{t.message}</p>
            {t.adminNote ? (
              <p className="rounded-lg bg-secondary p-3 text-sm">Not: {t.adminNote}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {actionsFor(t.status).map((s) => (
                <Button key={s} size="sm" variant="outline" onClick={() => openStatusDialog(t, s)}>
                  {SUPPORT_TICKET_STATUS_LABELS[s]}
                </Button>
              ))}
              {isAdmin ? (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deleting}
                  onClick={() => deleteOne(t.id)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Sil
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}

      <DialogRoot open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent title="Durum Güncelle">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {pendingTicket?.store?.name} — {pendingTicket?.subject}
              {pendingStatus ? (
                <>
                  {" "}
                  → <strong>{SUPPORT_TICKET_STATUS_LABELS[pendingStatus]}</strong>
                </>
              ) : null}
            </p>
            <div className="space-y-2">
              <Label>Admin notu (opsiyonel)</Label>
              <textarea
                className="min-h-24 w-full rounded-xl border p-3 text-sm"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Mağazaya görünecek yanıt / not"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                İptal
              </Button>
              <Button onClick={confirmStatusUpdate} disabled={saving}>
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
