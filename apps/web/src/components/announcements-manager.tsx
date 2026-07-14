"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchSlimStores } from "@/lib/stores-cache";
import { useIsStrictAdmin } from "@/lib/role-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import {
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_RECEIPT_STATUS_LABELS,
  thumbUrl,
  type AnnouncementReceiptStatus,
  type PaginatedResponse,
} from "@magaza/shared";

type Store = { id: string; name: string };
type Attachment = { label: string; url: string; type: string };

type Receipt = {
  id: string;
  status: AnnouncementReceiptStatus;
  readAt?: string | null;
  processingAt?: string | null;
  completedAt?: string | null;
  completionImages: string[];
  note?: string | null;
  store?: { id: string; name: string };
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: keyof typeof ANNOUNCEMENT_AUDIENCE_LABELS;
  storeIds: string[];
  attachments?: Attachment[] | null;
  publishedAt: string;
  receipts?: Receipt[];
  receipt?: Receipt | null;
};

const STATUS_BADGE: Record<AnnouncementReceiptStatus, "secondary" | "default" | "outline"> = {
  BEKLIYOR: "secondary",
  OKUNDU: "outline",
  ISLEME_ALINDI: "default",
  TAMAMLANDI: "default",
};

export function AnnouncementsManager() {
  const isAdmin = useIsStrictAdmin();
  const [items, setItems] = useState<Announcement[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"ALL_STORES" | "SELECTED_STORES">("ALL_STORES");
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/v1/admin/announcements");
    setItems(await res.json());
  }

  useEffect(() => {
    load();
    fetchSlimStores().then(setStores);
  }, []);

  function addLink() {
    if (!linkLabel || !linkUrl) return;
    const type = linkUrl.includes("wetransfer") || linkUrl.includes("we.tl") ? "wetransfer" : "link";
    setAttachments([...attachments, { label: linkLabel, url: linkUrl, type }]);
    setLinkLabel("");
    setLinkUrl("");
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setError("");
    const res = await fetch("/api/v1/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, audience, storeIds, attachments }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Duyuru yayınlanamadı");
      return;
    }
    setTitle("");
    setBody("");
    setAttachments([]);
    setStoreIds([]);
    load();
  }

  function receiptSummary(receipts: Receipt[] = []) {
    const counts: Record<AnnouncementReceiptStatus, number> = {
      BEKLIYOR: 0,
      OKUNDU: 0,
      ISLEME_ALINDI: 0,
      TAMAMLANDI: 0,
    };
    for (const r of receipts) counts[r.status] += 1;
    return counts;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Duyurular"
        subtitle="Sidebar → Duyurular. Her duyurunun altında mağaza bazlı aşama takibi görünür."
      />

      {isAdmin && (
        <section className="panel-section space-y-4">
          <h2 className="font-semibold">Yeni Duyuru</h2>
          <form onSubmit={publish} className="space-y-4 max-w-3xl">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Başlık</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">İçerik</Label>
              <textarea className="min-h-32 w-full rounded-xl border p-3 text-sm" value={body} onChange={(e) => setBody(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Hedef</Label>
              <select className="field-select" value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)}>
                <option value="ALL_STORES">{ANNOUNCEMENT_AUDIENCE_LABELS.ALL_STORES}</option>
                <option value="SELECTED_STORES">{ANNOUNCEMENT_AUDIENCE_LABELS.SELECTED_STORES}</option>
              </select>
            </div>
            {audience === "SELECTED_STORES" && (
              <div className="flex flex-wrap gap-2">
                {stores.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={storeIds.includes(s.id)}
                      onChange={(e) => {
                        setStoreIds(e.target.checked ? [...storeIds, s.id] : storeIds.filter((id) => id !== s.id));
                      }}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
            <div className="grid gap-2 md:grid-cols-3">
              <Input placeholder="Link etiketi" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} />
              <Input placeholder="https://we.tl/..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="md:col-span-2" />
              <Button type="button" variant="outline" onClick={addLink}>Link Ekle</Button>
            </div>
            {attachments.map((a, i) => (
              <div key={i} className="text-sm text-muted-foreground">{a.label}: {a.url}</div>
            ))}
            <div className="flex items-center gap-3">
              <Button type="submit">Yayınla</Button>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          </form>
        </section>
      )}

      <div className="space-y-4">
        {items.map((a) => {
          const summary = receiptSummary(a.receipts);
          return (
            <Card key={a.id}>
              <CardContent className="space-y-4 p-6">
                <div>
                  <h3 className="text-lg font-semibold">{a.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                  {Array.isArray(a.attachments) &&
                    a.attachments.map((att, i) => (
                      <a key={i} href={att.url} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-primary underline">
                        {att.label}
                      </a>
                    ))}
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">Bekliyor: {summary.BEKLIYOR}</Badge>
                  <Badge variant="outline">Okundu: {summary.OKUNDU}</Badge>
                  <Badge>İşleme: {summary.ISLEME_ALINDI}</Badge>
                  <Badge>Tamamlandı: {summary.TAMAMLANDI}</Badge>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Mağaza Bazlı Aşama Takibi</h4>
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-left">
                        <tr>
                          <th className="px-3 py-2 font-medium">Mağaza</th>
                          <th className="px-3 py-2 font-medium">Durum</th>
                          <th className="px-3 py-2 font-medium">Okundu</th>
                          <th className="px-3 py-2 font-medium">İşleme</th>
                          <th className="px-3 py-2 font-medium">Tamamlandı</th>
                          <th className="px-3 py-2 font-medium">Görseller</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(a.receipts ?? []).map((r) => (
                          <tr key={r.id} className="border-t">
                            <td className="px-3 py-2">{r.store?.name ?? "-"}</td>
                            <td className="px-3 py-2">
                              <Badge variant={STATUS_BADGE[r.status]}>
                                {ANNOUNCEMENT_RECEIPT_STATUS_LABELS[r.status]}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {r.readAt ? new Date(r.readAt).toLocaleString("tr-TR") : "-"}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {r.processingAt ? new Date(r.processingAt).toLocaleString("tr-TR") : "-"}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {r.completedAt ? new Date(r.completedAt).toLocaleString("tr-TR") : "-"}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-2">
                                {(r.completionImages ?? []).map((url) => (
                                  <a key={url} href={url} target="_blank" rel="noreferrer" className="relative h-12 w-12 overflow-hidden rounded border">
                                    <Image src={thumbUrl(url) ?? url} alt="" fill className="object-cover" unoptimized />
                                  </a>
                                ))}
                                {!r.completionImages?.length ? <span className="text-muted-foreground">-</span> : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!a.receipts?.length ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-4 text-muted-foreground">
                              Henüz mağaza kaydı yok
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function StoreAnnouncementsView() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, FileList | null>>({});
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/v1/announcements");
    const data: PaginatedResponse<Announcement> = await res.json();
    setItems(data.items);
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: "OKUNDU" | "ISLEME_ALINDI" | "TAMAMLANDI") {
    setLoadingId(id);
    setError("");
    try {
      let res: Response;
      if (action === "TAMAMLANDI") {
        const selected = files[id];
        if (!selected?.length) {
          setError("Tamamlama için en az bir görsel seçin");
          setLoadingId(null);
          return;
        }
        const form = new FormData();
        form.append("action", action);
        Array.from(selected).forEach((file, i) => form.append(`file_${i}`, file));
        res = await fetch(`/api/v1/announcements/${id}/receipt`, { method: "POST", body: form });
      } else {
        res = await fetch(`/api/v1/announcements/${id}/receipt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "İşlem başarısız");
        setLoadingId(null);
        return;
      }
      setFiles((prev) => ({ ...prev, [id]: null }));
      await load();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Duyurular" subtitle="Okuyun, işleme alın, tamamlayın" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {items.map((a) => {
        const status = a.receipt?.status ?? "BEKLIYOR";
        const busy = loadingId === a.id;
        return (
          <Card key={a.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-lg">{a.title}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(a.publishedAt).toLocaleString("tr-TR")}
                </p>
              </div>
              <Badge variant={STATUS_BADGE[status]}>{ANNOUNCEMENT_RECEIPT_STATUS_LABELS[status]}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap text-sm">{a.body}</p>
              {Array.isArray(a.attachments) &&
                a.attachments.map((att, i) => (
                  <a key={i} href={att.url} target="_blank" rel="noreferrer" className="block text-sm text-primary underline">
                    {att.label}
                  </a>
                ))}

              {(a.receipt?.completionImages?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2">
                  {a.receipt!.completionImages.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="relative h-20 w-20 overflow-hidden rounded-lg border">
                      <Image src={thumbUrl(url) ?? url} alt="" fill className="object-cover" unoptimized />
                    </a>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {status === "BEKLIYOR" && (
                  <Button disabled={busy} onClick={() => act(a.id, "OKUNDU")}>
                    Okudum
                  </Button>
                )}
                {(status === "BEKLIYOR" || status === "OKUNDU") && (
                  <Button variant="secondary" disabled={busy} onClick={() => act(a.id, "ISLEME_ALINDI")}>
                    İşleme Al
                  </Button>
                )}
                {status === "ISLEME_ALINDI" && (
                  <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Tamamlama görselleri (birden fazla)</Label>
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={(e) => setFiles((prev) => ({ ...prev, [a.id]: e.target.files }))}
                      />
                    </div>
                    <Button disabled={busy} onClick={() => act(a.id, "TAMAMLANDI")}>
                      Tamamlandı
                    </Button>
                  </div>
                )}
                {status === "TAMAMLANDI" && (
                  <p className="text-sm text-muted-foreground">Bu duyuru tamamlandı.</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
