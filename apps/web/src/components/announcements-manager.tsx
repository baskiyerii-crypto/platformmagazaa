"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import { fetchSlimStores } from "@/lib/stores-cache";
import { useIsStrictAdmin } from "@/lib/role-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DialogContent, DialogRoot } from "@/components/ui/dialog";
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
  OKUNDU: "default",
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
  const [publishing, setPublishing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editAudience, setEditAudience] = useState<"ALL_STORES" | "SELECTED_STORES">("ALL_STORES");
  const [editStoreIds, setEditStoreIds] = useState<string[]>([]);
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);
  const [editLinkLabel, setEditLinkLabel] = useState("");
  const [editLinkUrl, setEditLinkUrl] = useState("");
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    const res = await fetch("/api/v1/admin/announcements");
    setItems(await res.json());
    setSelected(new Set());
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
    if (!isAdmin || publishing) return;
    setPublishing(true);
    setError("");
    try {
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
      await load();
    } finally {
      setPublishing(false);
    }
  }

  function openEdit(a: Announcement) {
    setEditItem(a);
    setEditTitle(a.title);
    setEditBody(a.body);
    setEditAudience(a.audience);
    setEditStoreIds(a.storeIds ?? []);
    setEditAttachments(Array.isArray(a.attachments) ? [...a.attachments] : []);
    setEditLinkLabel("");
    setEditLinkUrl("");
    setEditError("");
  }

  async function saveEdit() {
    if (!editItem || savingEdit) return;
    setSavingEdit(true);
    setEditError("");
    try {
      const res = await fetch(`/api/v1/admin/announcements/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          body: editBody,
          audience: editAudience,
          storeIds: editStoreIds,
          attachments: editAttachments,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEditError(data.error ?? "Güncellenemedi");
        return;
      }
      setEditItem(null);
      await load();
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteOne(id: string, label: string) {
    if (busy) return;
    if (!confirm(`Duyuru silinsin mi?\n${label}`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/admin/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Silinemedi");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelected() {
    if (busy || selected.size === 0) return;
    if (!confirm(`${selected.size} duyuru silinsin mi?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/v1/admin/announcements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Toplu silme başarısız");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = items.length > 0 && items.every((a) => selected.has(a.id));

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
        subtitle="Yayınla, düzenle, sil — mağaza bazlı aşama takibi"
      />

      {isAdmin && (
        <section className="panel-section space-y-4">
          <h2 className="font-semibold">Yeni Duyuru</h2>
          <form onSubmit={publish} className="space-y-4 max-w-3xl">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Başlık</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required disabled={publishing} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">İçerik</Label>
              <textarea
                className="min-h-32 w-full rounded-xl border p-3 text-sm"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                disabled={publishing}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Hedef</Label>
              <select
                className="field-select"
                value={audience}
                onChange={(e) => setAudience(e.target.value as typeof audience)}
                disabled={publishing}
              >
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
                      disabled={publishing}
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
              <Input placeholder="Link etiketi" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} disabled={publishing} />
              <Input placeholder="https://we.tl/..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="md:col-span-2" disabled={publishing} />
              <Button type="button" variant="outline" onClick={addLink} disabled={publishing}>Link Ekle</Button>
            </div>
            {attachments.map((a, i) => (
              <div key={i} className="text-sm text-muted-foreground">{a.label}: {a.url}</div>
            ))}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={publishing}>
                {publishing ? "Yayınlanıyor..." : "Yayınla"}
              </Button>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          </form>
        </section>
      )}

      {isAdmin && items.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-secondary/20 px-4 py-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={allSelected}
              onChange={() => {
                if (allSelected) setSelected(new Set());
                else setSelected(new Set(items.map((a) => a.id)));
              }}
              disabled={busy}
            />
            Tümünü seç ({items.length})
          </label>
          <Button variant="destructive" size="sm" disabled={selected.size === 0 || busy} onClick={deleteSelected}>
            <Trash2 className="mr-1 h-4 w-4" />
            Seçilenleri sil ({selected.size})
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {items.map((a) => {
          const summary = receiptSummary(a.receipts);
          return (
            <Card key={a.id} className={selected.has(a.id) ? "ring-2 ring-primary/40" : undefined}>
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 gap-3">
                    {isAdmin && (
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0"
                        checked={selected.has(a.id)}
                        onChange={() => toggleOne(a.id)}
                        disabled={busy}
                        aria-label="Duyuru seç"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold">{a.title}</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                      {Array.isArray(a.attachments) &&
                        a.attachments.map((att, i) => (
                          <a key={i} href={att.url} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-primary underline">
                            {att.label}
                          </a>
                        ))}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(a)} disabled={busy}>
                        <Pencil className="mr-1 h-3 w-3" /> Düzenle
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => deleteOne(a.id, a.title)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" /> Sil
                      </Button>
                    </div>
                  )}
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

      <DialogRoot open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent title="Duyuru Düzenle">
          {editItem && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Başlık</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} disabled={savingEdit} />
              </div>
              <div className="space-y-1.5">
                <Label>İçerik</Label>
                <textarea
                  className="min-h-32 w-full rounded-xl border p-3 text-sm"
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  disabled={savingEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hedef</Label>
                <select
                  className="field-select"
                  value={editAudience}
                  onChange={(e) => setEditAudience(e.target.value as typeof editAudience)}
                  disabled={savingEdit}
                >
                  <option value="ALL_STORES">{ANNOUNCEMENT_AUDIENCE_LABELS.ALL_STORES}</option>
                  <option value="SELECTED_STORES">{ANNOUNCEMENT_AUDIENCE_LABELS.SELECTED_STORES}</option>
                </select>
              </div>
              {editAudience === "SELECTED_STORES" && (
                <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                  {stores.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editStoreIds.includes(s.id)}
                        disabled={savingEdit}
                        onChange={(e) => {
                          setEditStoreIds(
                            e.target.checked
                              ? [...editStoreIds, s.id]
                              : editStoreIds.filter((id) => id !== s.id)
                          );
                        }}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-3">
                <Input placeholder="Link etiketi" value={editLinkLabel} onChange={(e) => setEditLinkLabel(e.target.value)} disabled={savingEdit} />
                <Input placeholder="https://..." value={editLinkUrl} onChange={(e) => setEditLinkUrl(e.target.value)} className="sm:col-span-2" disabled={savingEdit} />
                <Button
                  type="button"
                  variant="outline"
                  disabled={savingEdit}
                  onClick={() => {
                    if (!editLinkLabel || !editLinkUrl) return;
                    const type =
                      editLinkUrl.includes("wetransfer") || editLinkUrl.includes("we.tl")
                        ? "wetransfer"
                        : "link";
                    setEditAttachments([
                      ...editAttachments,
                      { label: editLinkLabel, url: editLinkUrl, type },
                    ]);
                    setEditLinkLabel("");
                    setEditLinkUrl("");
                  }}
                >
                  Link Ekle
                </Button>
              </div>
              {editAttachments.map((att, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-muted-foreground">{att.label}: {att.url}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={savingEdit}
                    onClick={() => setEditAttachments(editAttachments.filter((_, idx) => idx !== i))}
                  >
                    Kaldır
                  </Button>
                </div>
              ))}
              {editError ? <p className="text-sm text-destructive">{editError}</p> : null}
              <Button className="w-full" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          )}
        </DialogContent>
      </DialogRoot>
    </div>
  );
}

export function StoreAnnouncementsView() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filesById, setFilesById] = useState<Record<string, File[]>>({});
  const [previewsById, setPreviewsById] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/v1/announcements", { cache: "no-store" });
    const data: PaginatedResponse<Announcement> = await res.json();
    setItems(data.items);
  }

  useEffect(() => {
    load();
  }, []);

  function setFilesFor(id: string, list: FileList | null) {
    const files = list ? Array.from(list) : [];
    setFilesById((prev) => ({ ...prev, [id]: files }));
    setPreviewsById((prev) => {
      for (const u of prev[id] ?? []) URL.revokeObjectURL(u);
      return {
        ...prev,
        [id]: files.map((f) => URL.createObjectURL(f)),
      };
    });
  }

  async function act(id: string, action: "OKUNDU" | "ISLEME_ALINDI" | "TAMAMLANDI") {
    if (loadingId) return;
    setLoadingId(id);
    setError("");
    try {
      let res: Response;
      if (action === "TAMAMLANDI") {
        const selected = filesById[id] ?? [];
        if (!selected.length) {
          setError("Tamamlama için en az bir görsel seçin (JPG/PNG/WebP)");
          return;
        }
        const form = new FormData();
        form.append("action", action);
        selected.forEach((file, i) => form.append(`file_${i}`, file));
        res = await fetch(`/api/v1/announcements/${id}/receipt`, { method: "POST", body: form });
      } else {
        res = await fetch(`/api/v1/announcements/${id}/receipt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
          cache: "no-store",
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "İşlem başarısız");
        return;
      }

      const updated = await res.json().catch(() => null);
      // Anında UI güncelle — liste cache'i yüzünden geri kaymasın
      if (updated?.status) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  receipt: {
                    id: updated.id ?? item.receipt?.id ?? "",
                    status: updated.status,
                    readAt: updated.readAt ?? item.receipt?.readAt,
                    processingAt: updated.processingAt ?? item.receipt?.processingAt,
                    completedAt: updated.completedAt ?? item.receipt?.completedAt,
                    completionImages:
                      updated.completionImages ?? item.receipt?.completionImages ?? [],
                    note: updated.note ?? item.receipt?.note,
                  },
                }
              : item
          )
        );
      }

      setFilesFor(id, null);
      await load();
    } finally {
      setLoadingId(null);
    }
  }

  async function addMoreImages(id: string) {
    const selected = filesById[id] ?? [];
    if (!selected.length) {
      setError("Eklenecek görsel seçin");
      return;
    }
    setLoadingId(id);
    setError("");
    try {
      const form = new FormData();
      form.append("action", "TAMAMLANDI");
      selected.forEach((file, i) => form.append(`file_${i}`, file));
      const res = await fetch(`/api/v1/announcements/${id}/receipt`, { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Görsel eklenemedi");
        return;
      }
      setFilesFor(id, null);
      await load();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Duyurular" subtitle="Okuyun, işleme alın, görsel ekleyerek tamamlayın" />
      {error ? <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      {items.map((a) => {
        const status = a.receipt?.status ?? "BEKLIYOR";
        const busy = loadingId === a.id;
        const previews = previewsById[a.id] ?? [];
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
                {(status === "OKUNDU") && (
                  <Button variant="secondary" disabled={busy} onClick={() => act(a.id, "ISLEME_ALINDI")}>
                    İşleme Al
                  </Button>
                )}
                {(status === "ISLEME_ALINDI" || status === "TAMAMLANDI") && (
                  <div className="w-full space-y-3 rounded-xl border bg-secondary/20 p-4">
                    <Label className="text-sm font-medium">
                      {status === "ISLEME_ALINDI"
                        ? "Tamamlama görselleri (zorunlu)"
                        : "Ek görsel ekle"}
                    </Label>
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/*"
                      multiple
                      disabled={busy}
                      onChange={(e) => {
                        setFilesFor(a.id, e.target.files);
                        e.target.value = "";
                      }}
                    />
                    {previews.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {previews.map((src) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={src} src={src} alt="" className="h-20 w-20 rounded-lg border object-cover" />
                        ))}
                      </div>
                    )}
                    {status === "ISLEME_ALINDI" ? (
                      <Button disabled={busy || !(filesById[a.id]?.length)} onClick={() => act(a.id, "TAMAMLANDI")}>
                        {busy ? "Yükleniyor..." : "Görsel ile tamamla"}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        disabled={busy || !(filesById[a.id]?.length)}
                        onClick={() => addMoreImages(a.id)}
                      >
                        {busy ? "Yükleniyor..." : "Görsel ekle"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
