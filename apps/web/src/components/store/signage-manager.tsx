"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogContent, DialogRoot } from "@/components/ui/dialog";
import { ImageUploadPreview } from "@/components/image-upload-preview";
import { ChangeRequestDialog } from "@/components/change-request-dialog";
import { PageHeader } from "@/components/page-header";
import { thumbUrl } from "@magaza/shared";
import { fetchDefinitions } from "@/lib/definitions-cache";
import { cn } from "@/lib/utils";

type Props = {
  storeId?: string;
  adminMode?: boolean;
  formOnly?: boolean;
  storeName?: string;
  onSuccess?: () => void;
};

type SignageEntry = {
  id: string;
  subType: { id: string; name: string };
  placement: { id: string; name: string };
  en: number;
  boy: number;
  adet: number;
  note?: string | null;
  gorselUrl?: string | null;
};

export function SignageManager({ storeId, adminMode, formOnly, storeName, onSuccess }: Props = {}) {
  const [subTypes, setSubTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [placements, setPlacements] = useState<Array<{ id: string; name: string }>>([]);
  const [entries, setEntries] = useState<SignageEntry[]>([]);
  const [subTypeId, setSubTypeId] = useState("");
  const [placementId, setPlacementId] = useState("");
  const [en, setEn] = useState("");
  const [boy, setBoy] = useState("");
  const [adet, setAdet] = useState("1");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [editEntry, setEditEntry] = useState<SignageEntry | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPlacementId, setEditPlacementId] = useState("");
  const [editEn, setEditEn] = useState("");
  const [editBoy, setEditBoy] = useState("");
  const [editAdet, setEditAdet] = useState("");
  const [editNote, setEditNote] = useState("");
  const [changeId, setChangeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const entriesUrl =
      storeId && adminMode
        ? `/api/v1/store/signage-entries?storeId=${encodeURIComponent(storeId)}`
        : "/api/v1/store/signage-entries";
    const [defs, e] = await Promise.all([
      fetchDefinitions<{
        categories: Array<{ type: string; subTypes: Array<{ id: string; name: string }> }>;
        placements: Array<{ id: string; name: string }>;
      }>(),
      formOnly
        ? Promise.resolve([] as SignageEntry[])
        : fetch(entriesUrl).then((r) => r.json()).then((data) => (Array.isArray(data) ? data : data.items ?? [])),
    ]);
    const magazaIci = defs.categories.find((c) => c.type === "MAGAZA_ICI");
    setSubTypes(magazaIci?.subTypes ?? []);
    setPlacements(defs.placements ?? []);
    if (magazaIci?.subTypes[0]) setSubTypeId(magazaIci.subTypes[0].id);
    if (defs.placements[0]) setPlacementId(defs.placements[0].id);
    if (!formOnly) setEntries(e);
  }

  useEffect(() => { load(); }, [storeId, adminMode, formOnly]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!file) {
      alert("Fotoğraf zorunlu");
      return;
    }
    if (!placementId) {
      alert("Konum seçin");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (storeId) formData.append("storeId", storeId);
      formData.append("subTypeId", subTypeId);
      formData.append("placementId", placementId);
      formData.append("en", en);
      formData.append("boy", boy);
      formData.append("adet", adet);
      formData.append("note", note);
      formData.append("file", file);
      const res = await fetch("/api/v1/store/signage-entries", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Kayıt eklenemedi.");
        return;
      }
      setEn(""); setBoy(""); setAdet("1"); setNote(""); setFile(null);
      if (formOnly) {
        onSuccess?.();
      } else {
        await load();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function saveEdit() {
    if (!editEntry || submitting) return;
    setSubmitting(true);
    try {
      if (editFile) {
        const fd = new FormData();
        fd.append("file", editFile);
        await fetch(`/api/v1/store/signage-entries/${editEntry.id}`, { method: "PATCH", body: fd });
      }
      await fetch(`/api/v1/store/signage-entries/${editEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placementId: editPlacementId,
          en: Number(editEn),
          boy: Number(editBoy),
          adet: Number(editAdet),
          note: editNote || null,
        }),
      });
      setEditEntry(null);
      setEditFile(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm("Kayıt silinsin mi?")) return;
    await fetch(`/api/v1/store/signage-entries/${id}`, { method: "DELETE" });
    load();
  }

  const noTypes = subTypes.length === 0;
  const noPlacements = placements.length === 0;

  return (
    <div className="space-y-6">
      {!formOnly && (
        <PageHeader
          title="Mağaza İçi Reklamlar"
          subtitle={adminMode ? "Mağaza adına kayıt" : "Yöneticinin tanımladığı tür ve konumdan seçin"}
        />
      )}

      {formOnly && (
        <div className="rounded-xl border bg-white p-4">
          <h3 className="font-semibold">Mağaza İçi Kaydı — {storeName ?? "Mağaza"}</h3>
        </div>
      )}

      {(noTypes || noPlacements) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {noTypes && <p>Envanter türü tanımlı değil. Yönetici Tanımlar ekranından Mağaza İçi türü eklemelidir.</p>}
          {noPlacements && <p>Konum tanımlı değil. Yönetici Tanımlar ekranından konum eklemelidir.</p>}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Yeni Kayıt</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Envanter Türü</Label>
              <div className="flex flex-wrap gap-2">
                {subTypes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSubTypeId(s.id)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm transition-colors",
                      subTypeId === s.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Konum</Label>
              <div className="flex flex-wrap gap-2">
                {placements.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlacementId(p.id)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm transition-colors",
                      placementId === p.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2"><Label>En (cm)</Label><Input value={en} onChange={(e) => setEn(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Boy (cm)</Label><Input value={boy} onChange={(e) => setBoy(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Adet</Label><Input value={adet} onChange={(e) => setAdet(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Not</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <div className="md:col-span-2">
              <ImageUploadPreview file={file} onFileChange={setFile} required />
            </div>
            <Button type="submit" className="md:col-span-2" disabled={submitting || noTypes || noPlacements}>
              {submitting ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {!formOnly && (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <Card key={entry.id} className="overflow-hidden transition-shadow hover:shadow-md">
            <div className="relative aspect-video bg-secondary">
              {entry.gorselUrl && (
                <Image src={thumbUrl(entry.gorselUrl) ?? entry.gorselUrl} alt="" fill className="object-cover" unoptimized />
              )}
            </div>
            <CardContent className="space-y-3 p-4">
              <div className="font-semibold">{entry.subType.name}</div>
              <div className="text-sm text-muted-foreground">{entry.placement.name}</div>
              <div className="text-sm text-muted-foreground">{entry.en}×{entry.boy} cm · {entry.adet} adet</div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setEditEntry(entry);
                  setEditPlacementId(entry.placement.id);
                  setEditEn(String(entry.en));
                  setEditBoy(String(entry.boy));
                  setEditAdet(String(entry.adet));
                  setEditNote(entry.note ?? "");
                }}><Pencil className="h-3 w-3 mr-1" /> Düzenle</Button>
                {!adminMode && (
                  <Button variant="outline" size="sm" onClick={() => setChangeId(entry.id)}>Değişim Talebi</Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => deleteEntry(entry.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      <DialogRoot open={!!editEntry} onOpenChange={(o) => !o && setEditEntry(null)}>
        <DialogContent title="Mağaza İçi Düzenle">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Konum</Label>
              <select className="field-select" value={editPlacementId} onChange={(e) => setEditPlacementId(e.target.value)}>
                {placements.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <Input value={editEn} onChange={(e) => setEditEn(e.target.value)} placeholder="En (cm)" />
            <Input value={editBoy} onChange={(e) => setEditBoy(e.target.value)} placeholder="Boy (cm)" />
            <Input value={editAdet} onChange={(e) => setEditAdet(e.target.value)} placeholder="Adet" />
            <Input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Not" />
            <ImageUploadPreview existingUrl={editEntry?.gorselUrl} file={editFile} onFileChange={setEditFile} />
            <Button onClick={saveEdit} className="w-full" disabled={submitting}>
              {submitting ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </DialogContent>
      </DialogRoot>

      {changeId && (
        <ChangeRequestDialog open onOpenChange={(o) => !o && setChangeId(null)} targetType="STORE_SIGNAGE" targetId={changeId} />
      )}
    </div>
  );
}
