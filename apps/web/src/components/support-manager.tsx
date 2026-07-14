"use client";

import { useEffect, useState } from "react";
import { fetchSlimStores } from "@/lib/stores-cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
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

export function StoreSupportManager() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/v1/support-tickets");
    const data: PaginatedResponse<Ticket> = await res.json();
    setTickets(data.items);
  }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/v1/support-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message }),
    });
    setSubject("");
    setMessage("");
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Destek" subtitle="Yöneticiye destek talebi gönderin" />
      <Card>
        <CardHeader><CardTitle>Yeni Talep</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4 max-w-lg">
            <div className="space-y-2"><Label>Konu</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Mesaj</Label><textarea className="min-h-28 w-full rounded-xl border p-3 text-sm" value={message} onChange={(e) => setMessage(e.target.value)} required /></div>
            <Button type="submit">Gönder</Button>
          </form>
        </CardContent>
      </Card>
      {tickets.map((t) => (
        <Card key={t.id}>
          <CardContent className="p-4">
            <div className="font-semibold">{t.subject}</div>
            <div className="text-sm text-muted-foreground">{SUPPORT_TICKET_STATUS_LABELS[t.status]}</div>
            <p className="mt-2 text-sm">{t.message}</p>
            {t.adminNote && <p className="mt-2 rounded-lg bg-secondary p-3 text-sm">Yanıt: {t.adminNote}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminSupportManager() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [storeId, setStoreId] = useState("");
  const [status, setStatus] = useState("");
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);

  async function load() {
    const params = new URLSearchParams();
    if (storeId) params.set("storeId", storeId);
    if (status) params.set("status", status);
    const res = await fetch(`/api/v1/admin/support-tickets?${params}`);
    const data: PaginatedResponse<Ticket> = await res.json();
    setTickets(data.items);
  }

  useEffect(() => {
    fetchSlimStores().then(setStores);
  }, []);

  useEffect(() => { load(); }, [storeId, status]);

  async function updateTicket(id: string, newStatus: SupportTicketStatus, adminNote?: string) {
    await fetch(`/api/v1/admin/support-tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, adminNote }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Destek Talepleri" subtitle="Mağaza destek istekleri" />
      <div className="grid gap-4 md:grid-cols-2">
        <select className="h-10 rounded-xl border px-3 text-sm" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
          <option value="">Tüm mağazalar</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="h-10 rounded-xl border px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tüm durumlar</option>
          {(Object.keys(SUPPORT_TICKET_STATUS_LABELS) as SupportTicketStatus[]).map((s) => (
            <option key={s} value={s}>{SUPPORT_TICKET_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>
      {tickets.map((t) => (
        <Card key={t.id}>
          <CardContent className="space-y-3 p-4">
            <div className="font-semibold">{t.store?.name} — {t.subject}</div>
            <p className="text-sm">{t.message}</p>
            <div className="flex flex-wrap gap-2">
              {(["IN_PROGRESS", "RESOLVED", "CLOSED"] as SupportTicketStatus[]).map((s) => (
                <Button key={s} size="sm" variant="outline" onClick={() => {
                  const note = prompt("Admin notu (opsiyonel):") ?? undefined;
                  updateTicket(t.id, s, note);
                }}>
                  {SUPPORT_TICKET_STATUS_LABELS[s]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
