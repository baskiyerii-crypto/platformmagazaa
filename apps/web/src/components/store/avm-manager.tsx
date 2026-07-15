"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogContent, DialogRoot } from "@/components/ui/dialog";
import { ImageUploadPreview } from "@/components/image-upload-preview";
import { ChangeRequestDialog } from "@/components/change-request-dialog";
import { PageHeader } from "@/components/page-header";
import { thumbUrl } from "@magaza/shared";
import type { AvmVitrinKind } from "@magaza/shared";
import { fetchDefinitions } from "@/lib/definitions-cache";

type Definitions = {
  categories: Array<{ subTypes: Array<{ id: string; name: string; code: string }> }>;
  placements: Array<{ id: string; name: string }>;
};

type Props = {
  storeId?: string;
  adminMode?: boolean;
  formOnly?: boolean;
  storeName?: string;
  onSuccess?: () => void;
  initialDefinitions?: Definitions | null;
  initialEntries?: AvmEntry[];
};

type VitrinForm = {
  siraNo: number;
  en: string;
  boy: string;
  camEn: string;
  camBoy: string;
  konum: string;
  file?: File | null;
};

type VideoForm = { placementId: string; adet: string; en: string; boy: string };

type Vitrin = {
  id: string;
  kind?: AvmVitrinKind;
  siraNo: number;
  en: number;
  boy: number;
  camEn?: number | null;
  camBoy?: number | null;
  konum?: string | null;
  gorselUrl?: string | null;
};

type AvmEntry = {
  id: string;
  subType: { name: string; code: string };
  vitrins: Vitrin[];
  videos: Array<{ id: string; adet: number; placement: { name: string } }>;
};

type SectionTab = "VITRIN" | "EKSTRA_ALAN" | "VIDEO";

const emptyVitrinForm = (siraNo = 1): VitrinForm => ({
  siraNo,
  en: "",
  boy: "",
  camEn: "",
  camBoy: "",
  konum: "",
  file: null,
});

export function AvmManager({
  storeId,
  adminMode,
  formOnly,
  storeName,
  onSuccess,
  initialDefinitions,
  initialEntries,
}: Props = {}) {
  const [defs, setDefs] = useState<Definitions | null>(initialDefinitions ?? null);
  const [entries, setEntries] = useState<AvmEntry[]>(initialEntries ?? []);
  const skipInitialFetch = useRef(Boolean(initialDefinitions && !formOnly && !adminMode));
  const [areaTab, setAreaTab] = useState<"UCRETSIZ" | "UCRETLI">("UCRETSIZ");
  const [sectionTab, setSectionTab] = useState<SectionTab>("VITRIN");
  const [subTypeId, setSubTypeId] = useState("");
  const [vitrinForms, setVitrinForms] = useState<VitrinForm[]>([emptyVitrinForm()]);
  const [videos, setVideos] = useState<VideoForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [editVitrin, setEditVitrin] = useState<Vitrin | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editEn, setEditEn] = useState("");
  const [editBoy, setEditBoy] = useState("");
  const [editCamEn, setEditCamEn] = useState("");
  const [editCamBoy, setEditCamBoy] = useState("");
  const [editKonum, setEditKonum] = useState("");
  const [changeTarget, setChangeTarget] = useState<{ type: string; id: string } | null>(null);

  async function load() {
    const entriesUrl =
      storeId && adminMode
        ? `/api/v1/store/avm-entries?storeId=${encodeURIComponent(storeId)}`
        : "/api/v1/store/avm-entries";
    const [d, e] = await Promise.all([
      fetchDefinitions<Definitions>(),
      formOnly
        ? Promise.resolve([] as AvmEntry[])
        : fetch(entriesUrl).then((r) => r.json()).then((data) => (Array.isArray(data) ? data : data.items ?? [])),
    ]);
    setDefs(d);
    const st = d.categories.flatMap((c) => c.subTypes).find((s) => s.code === areaTab);
    if (st) setSubTypeId(st.id);
    if (!formOnly) setEntries(e);
  }

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    load();
  }, [storeId, adminMode, formOnly]);

  useEffect(() => {
    const st = defs?.categories.flatMap((c) => c.subTypes).find((s) => s.code === areaTab);
    if (st) setSubTypeId(st.id);
  }, [areaTab, defs]);

  function addVitrinForm() {
    setVitrinForms([...vitrinForms, emptyVitrinForm(vitrinForms.length + 1)]);
  }

  function addVideo() {
    setVideos([...videos, { placementId: defs?.placements[0]?.id ?? "", adet: "1", en: "", boy: "" }]);
  }

  async function submitVitrinOrExtra(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const kind = sectionTab === "EKSTRA_ALAN" ? "EKSTRA_ALAN" : "VITRIN";
    if (vitrinForms.some((v) => !v.file)) {
      alert("Her kayıt için fotoğraf zorunludur.");
      return;
    }
    if (kind === "EKSTRA_ALAN" && vitrinForms.some((v) => !v.konum.trim())) {
      alert("Ekstra alan için konum zorunludur.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      if (storeId) formData.append("storeId", storeId);
      formData.append("subTypeId", subTypeId);
      formData.append(
        "vitrins",
        JSON.stringify(
          vitrinForms.map((v) => ({
            kind,
            siraNo: v.siraNo,
            en: Number(v.en),
            boy: Number(v.boy),
            camEn: kind === "VITRIN" && v.camEn ? Number(v.camEn) : null,
            camBoy: kind === "VITRIN" && v.camBoy ? Number(v.camBoy) : null,
            konum: kind === "EKSTRA_ALAN" ? v.konum.trim() : null,
          }))
        )
      );
      formData.append("videos", "[]");
      vitrinForms.forEach((v, i) => {
        if (v.file) formData.append(`vitrinFile_${i}`, v.file);
      });
      const res = await fetch("/api/v1/store/avm-entries", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Kayıt eklenemedi.");
        return;
      }
      setVitrinForms([emptyVitrinForm()]);
      if (formOnly) onSuccess?.();
      else await load();
    } finally {
      setLoading(false);
    }
  }

  async function submitVideo(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (videos.length === 0) {
      alert("En az bir video kaydı ekleyin.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      if (storeId) formData.append("storeId", storeId);
      formData.append("subTypeId", subTypeId);
      formData.append("vitrins", "[]");
      formData.append(
        "videos",
        JSON.stringify(
          videos.map((v) => ({
            placementId: v.placementId,
            adet: Number(v.adet),
            en: v.en ? Number(v.en) : null,
            boy: v.boy ? Number(v.boy) : null,
          }))
        )
      );
      const res = await fetch("/api/v1/store/avm-entries", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Video kaydı eklenemedi.");
        return;
      }
      setVideos([]);
      if (formOnly) onSuccess?.();
      else await load();
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit() {
    if (!editVitrin || loading) return;
    setLoading(true);
    try {
      let res: Response;
      if (editFile) {
        const fd = new FormData();
        fd.append("file", editFile);
        fd.append("en", editEn);
        fd.append("boy", editBoy);
        fd.append("kind", editVitrin.kind ?? "VITRIN");
        if (editVitrin.kind === "EKSTRA_ALAN") {
          fd.append("konum", editKonum.trim());
        } else {
          fd.append("camEn", editCamEn);
          fd.append("camBoy", editCamBoy);
        }
        res = await fetch(`/api/v1/store/avm-vitrins/${editVitrin.id}`, {
          method: "PATCH",
          body: fd,
        });
      } else {
        res = await fetch(`/api/v1/store/avm-vitrins/${editVitrin.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vitrinId: editVitrin.id,
            kind: editVitrin.kind,
            en: Number(editEn),
            boy: Number(editBoy),
            camEn: editVitrin.kind === "VITRIN" && editCamEn ? Number(editCamEn) : null,
            camBoy: editVitrin.kind === "VITRIN" && editCamBoy ? Number(editCamBoy) : null,
            konum: editVitrin.kind === "EKSTRA_ALAN" ? editKonum.trim() : null,
          }),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Kayıt güncellenemedi.");
        return;
      }
      setEditVitrin(null);
      setEditFile(null);
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function deleteVitrin(id: string, label: string) {
    if (!confirm(`${label} silinsin mi?`)) return;
    await fetch(`/api/v1/store/avm-vitrins/${id}`, { method: "DELETE" });
    load();
  }

  const filtered = entries.filter((e) => e.subType.code === areaTab);
  const vitrinItems = filtered.flatMap((entry) =>
    entry.vitrins
      .filter((v) => v.kind === "VITRIN" || !v.kind)
      .map((v) => ({ entry, v }))
  );
  const extraItems = filtered.flatMap((entry) =>
    entry.vitrins.filter((v) => v.kind === "EKSTRA_ALAN").map((v) => ({ entry, v }))
  );
  const videoItems = filtered.flatMap((entry) =>
    entry.videos.map((v) => ({ entry, v }))
  );

  return (
    <div className="space-y-6">
      {!formOnly && (
        <PageHeader
          title="AVM Alanları"
          subtitle={adminMode ? "Seçili mağaza adına envanter girişi" : "Vitrin, ekstra alan ve video kayıtları"}
        />
      )}

      {formOnly && (
        <div className="card-surface rounded-xl border p-4">
          <h3 className="font-semibold">AVM Kaydı — {storeName ?? "Mağaza"}</h3>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(["UCRETSIZ", "UCRETLI"] as const).map((t) => (
          <Button key={t} variant={areaTab === t ? "default" : "outline"} onClick={() => setAreaTab(t)}>
            {t === "UCRETSIZ" ? "Ücretsiz Alanlar" : "Ücretli Alanlar"}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["VITRIN", "Vitrinler"],
            ["EKSTRA_ALAN", "Ekstra Alanlar"],
            ["VIDEO", "Videolar"],
          ] as const
        ).map(([key, label]) => (
          <Button key={key} variant={sectionTab === key ? "default" : "outline"} size="sm" onClick={() => setSectionTab(key)}>
            {label}
          </Button>
        ))}
      </div>

      {sectionTab !== "VIDEO" ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Yeni {sectionTab === "EKSTRA_ALAN" ? "Ekstra Alan" : "Vitrin"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitVitrinOrExtra} className="space-y-6">
              {vitrinForms.map((v, i) => (
                <div key={i} className="card-surface space-y-3 rounded-2xl border p-4">
                  <Label>
                    {sectionTab === "EKSTRA_ALAN" ? "Ekstra Alan" : "Vitrin"} {v.siraNo}
                  </Label>
                  {sectionTab === "EKSTRA_ALAN" && (
                    <Input
                      placeholder="Konum (manuel)"
                      value={v.konum}
                      onChange={(e) => {
                        const n = [...vitrinForms];
                        n[i].konum = e.target.value;
                        setVitrinForms(n);
                      }}
                      required
                    />
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      placeholder="En (cm)"
                      value={v.en}
                      onChange={(e) => {
                        const n = [...vitrinForms];
                        n[i].en = e.target.value;
                        setVitrinForms(n);
                      }}
                      required
                    />
                    <Input
                      placeholder="Boy (cm)"
                      value={v.boy}
                      onChange={(e) => {
                        const n = [...vitrinForms];
                        n[i].boy = e.target.value;
                        setVitrinForms(n);
                      }}
                      required
                    />
                  </div>
                  {sectionTab === "VITRIN" && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        placeholder="Cam En (opsiyonel)"
                        value={v.camEn}
                        onChange={(e) => {
                          const n = [...vitrinForms];
                          n[i].camEn = e.target.value;
                          setVitrinForms(n);
                        }}
                      />
                      <Input
                        placeholder="Cam Boy (opsiyonel)"
                        value={v.camBoy}
                        onChange={(e) => {
                          const n = [...vitrinForms];
                          n[i].camBoy = e.target.value;
                          setVitrinForms(n);
                        }}
                      />
                    </div>
                  )}
                  <ImageUploadPreview
                    file={v.file ?? null}
                    onFileChange={(f) => {
                      const n = [...vitrinForms];
                      n[i].file = f;
                      setVitrinForms(n);
                    }}
                    required
                  />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addVitrinForm}>
                <Plus className="h-4 w-4" /> Ekle
              </Button>
              <Button type="submit" disabled={loading || !subTypeId}>
                {loading ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Yeni Video Kaydı</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitVideo} className="space-y-4">
              {videos.map((v, i) => (
                <div key={i} className="grid gap-3 rounded-xl border p-4 md:grid-cols-4">
                  <select
                    className="field-select"
                    value={v.placementId}
                    onChange={(e) => {
                      const n = [...videos];
                      n[i].placementId = e.target.value;
                      setVideos(n);
                    }}
                  >
                    {defs?.placements.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <Input placeholder="Adet" value={v.adet} onChange={(e) => { const n = [...videos]; n[i].adet = e.target.value; setVideos(n); }} />
                  <Input placeholder="En" value={v.en} onChange={(e) => { const n = [...videos]; n[i].en = e.target.value; setVideos(n); }} />
                  <Input placeholder="Boy" value={v.boy} onChange={(e) => { const n = [...videos]; n[i].boy = e.target.value; setVideos(n); }} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addVideo}>
                <Plus className="h-4 w-4" /> Video Ekle
              </Button>
              <Button type="submit" disabled={loading || !subTypeId}>
                {loading ? "Kaydediliyor..." : "Video Kaydet"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {!formOnly && sectionTab === "VITRIN" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vitrinItems.map(({ entry, v }) => (
            <Card key={v.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <div className="relative aspect-video bg-secondary">
                {v.gorselUrl && (
                  <Image src={thumbUrl(v.gorselUrl) ?? v.gorselUrl} alt="" fill className="object-cover" unoptimized />
                )}
              </div>
              <CardContent className="space-y-3 p-4">
                <div className="font-semibold">
                  {entry.subType.name} · Vitrin {v.siraNo}
                </div>
                <div className="text-sm text-muted-foreground">
                  {v.en}×{v.boy} cm
                  {v.camEn && v.camBoy ? ` · Cam: ${v.camEn}×${v.camBoy}` : ""}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditVitrin(v);
                      setEditEn(String(v.en));
                      setEditBoy(String(v.boy));
                      setEditCamEn(v.camEn ? String(v.camEn) : "");
                      setEditCamBoy(v.camBoy ? String(v.camBoy) : "");
                      setEditKonum("");
                    }}
                  >
                    <Pencil className="mr-1 h-3 w-3" /> Düzenle
                  </Button>
                  {!adminMode && (
                    <Button variant="outline" size="sm" onClick={() => setChangeTarget({ type: "AVM_VITRIN", id: v.id })}>
                      Değişim Talebi
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => deleteVitrin(v.id, "Vitrin")}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!formOnly && sectionTab === "EKSTRA_ALAN" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {extraItems.map(({ entry, v }) => (
            <Card key={v.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <div className="relative aspect-video bg-secondary">
                {v.gorselUrl && (
                  <Image src={thumbUrl(v.gorselUrl) ?? v.gorselUrl} alt="" fill className="object-cover" unoptimized />
                )}
              </div>
              <CardContent className="space-y-3 p-4">
                <div className="font-semibold">{entry.subType.name} · Ekstra Alan {v.siraNo}</div>
                <div className="text-sm text-muted-foreground">
                  Konum: {v.konum ?? "—"} · {v.en}×{v.boy} cm
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditVitrin(v);
                      setEditEn(String(v.en));
                      setEditBoy(String(v.boy));
                      setEditCamEn("");
                      setEditCamBoy("");
                      setEditKonum(v.konum ?? "");
                    }}
                  >
                    <Pencil className="mr-1 h-3 w-3" /> Düzenle
                  </Button>
                  {!adminMode && (
                    <Button variant="outline" size="sm" onClick={() => setChangeTarget({ type: "AVM_VITRIN", id: v.id })}>
                      Değişim Talebi
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => deleteVitrin(v.id, "Ekstra alan")}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!formOnly && sectionTab === "VIDEO" && (
        <div className="space-y-3">
          {videoItems.map(({ entry, v }) => (
            <Card key={v.id}>
              <CardContent className="p-4">
                <div className="font-semibold">{entry.subType.name}</div>
                <div className="text-sm text-muted-foreground">
                  {v.placement.name} · {v.adet} adet
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DialogRoot open={!!editVitrin} onOpenChange={(o) => !o && setEditVitrin(null)}>
        <DialogContent title={editVitrin?.kind === "EKSTRA_ALAN" ? "Ekstra Alan Düzenle" : "Vitrin Düzenle"}>
          <div className="space-y-4">
            {editVitrin?.kind === "EKSTRA_ALAN" && (
              <Input value={editKonum} onChange={(e) => setEditKonum(e.target.value)} placeholder="Konum" />
            )}
            <Input value={editEn} onChange={(e) => setEditEn(e.target.value)} placeholder="En (cm)" />
            <Input value={editBoy} onChange={(e) => setEditBoy(e.target.value)} placeholder="Boy (cm)" />
            {editVitrin?.kind !== "EKSTRA_ALAN" && (
              <>
                <Input value={editCamEn} onChange={(e) => setEditCamEn(e.target.value)} placeholder="Cam En" />
                <Input value={editCamBoy} onChange={(e) => setEditCamBoy(e.target.value)} placeholder="Cam Boy" />
              </>
            )}
            <ImageUploadPreview existingUrl={editVitrin?.gorselUrl} file={editFile} onFileChange={setEditFile} />
            <Button onClick={saveEdit} className="w-full" disabled={loading}>
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </DialogContent>
      </DialogRoot>

      {changeTarget && (
        <ChangeRequestDialog
          open
          onOpenChange={(o) => !o && setChangeTarget(null)}
          targetType={changeTarget.type}
          targetId={changeTarget.id}
        />
      )}
    </div>
  );
}
