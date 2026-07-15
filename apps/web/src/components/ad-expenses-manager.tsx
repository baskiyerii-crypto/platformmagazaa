"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { fetchSlimStores } from "@/lib/stores-cache";
import { useIsStrictAdmin } from "@/lib/role-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";

type Store = { id: string; name: string };
type Category = { id: string; name: string; code?: string | null; active: boolean; sortOrder: number };
type Campaign = { id: string; title: string; publishedAt: string };
type Expense = {
  id: string;
  title: string;
  quantity: number;
  totalPrice: number;
  expenseDate: string;
  note?: string | null;
  store: { id: string; name: string };
  category: { id: string; name: string };
  announcement?: { id: string; title: string } | null;
  createdBy: { username: string };
};
type Summary = {
  grandTotal: number;
  count: number;
  byCampaignStore: Array<{
    announcementId: string | null;
    announcementTitle: string;
    storeId: string;
    storeName: string;
    total: number;
    count: number;
  }>;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AdminAdExpensesManager() {
  const isAdmin = useIsStrictAdmin();
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [catName, setCatName] = useState("");
  const [error, setError] = useState("");

  const [period, setPeriod] = useState<"" | "day" | "month" | "year">("month");
  const [categoryId, setCategoryId] = useState("");
  const [announcementId, setAnnouncementId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [link, setLink] = useState<"all" | "campaign" | "general">("all");

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (period) p.set("period", period);
    if (categoryId) p.set("categoryId", categoryId);
    if (announcementId) p.set("announcementId", announcementId);
    if (storeId) p.set("storeId", storeId);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    if (link !== "all") p.set("link", link);
    return p.toString();
  }, [period, categoryId, announcementId, storeId, dateFrom, dateTo, link]);

  async function loadCats() {
    const res = await fetch("/api/v1/admin/ad-expense-categories?includeInactive=1");
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? `Kategoriler yüklenemedi (${res.status})`);
      setCategories([]);
      return;
    }
    setCategories(Array.isArray(data) ? data : []);
  }

  async function loadData() {
    const [expRes, sumRes, campRes] = await Promise.all([
      fetch(`/api/v1/ad-expenses?${query}`),
      fetch(`/api/v1/ad-expenses?summary=1&${query}`),
      fetch("/api/v1/ad-expenses?campaigns=1"),
    ]);
    const [exp, sum, camps] = await Promise.all([
      expRes.json().catch(() => null),
      sumRes.json().catch(() => null),
      campRes.json().catch(() => null),
    ]);
    if (!expRes.ok || !sumRes.ok || !campRes.ok) {
      setError(
        exp?.error || sum?.error || camps?.error || "Reklam giderleri yüklenemedi (şema güncellemesi gerekebilir)"
      );
      setExpenses([]);
      setSummary(null);
      setCampaigns([]);
      return;
    }
    setError("");
    setExpenses(Array.isArray(exp) ? exp : []);
    setSummary(sum);
    setCampaigns(Array.isArray(camps) ? camps : []);
  }

  useEffect(() => {
    loadCats();
    fetchSlimStores().then(setStores);
  }, []);

  useEffect(() => {
    loadData();
  }, [query]);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin || !catName.trim()) return;
    setError("");
    const res = await fetch("/api/v1/admin/ad-expense-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Kategori eklenemedi");
      return;
    }
    setCatName("");
    await loadCats();
  }

  async function deactivateCategory(id: string) {
    if (!isAdmin || !confirm("Kategori pasif edilsin mi?")) return;
    await fetch(`/api/v1/admin/ad-expense-categories/${id}`, { method: "DELETE" });
    await loadCats();
  }

  async function deleteExpense(id: string) {
    if (!confirm("Gider silinsin mi?")) return;
    await fetch(`/api/v1/ad-expenses/${id}`, { method: "DELETE" });
    await loadData();
  }

  function downloadExcel() {
    window.open(`/api/v1/admin/export/ad-expenses?format=excel&${query}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reklam Giderleri"
        subtitle="Kategoriler, mağaza harcamaları ve Excel raporları"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gider Kategorileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={addCategory} className="flex flex-wrap gap-2">
              <Input
                placeholder="Örn. Baskı, Montaj, Medya"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="max-w-xs"
              />
              <Button type="submit">
                <Plus className="mr-1 h-4 w-4" /> Kategori Ekle
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
                  <span className={!c.active ? "text-muted-foreground line-through" : ""}>{c.name}</span>
                  {c.active && (
                    <button type="button" onClick={() => deactivateCategory(c.id)} className="text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!c.active && <Badge variant="secondary">Pasif</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Filtre & Excel</CardTitle>
          <Button variant="outline" onClick={downloadExcel}>
            <Download className="mr-1 h-4 w-4" /> Excel İndir
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Dönem</Label>
            <select className="field-select" value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
              <option value="">Özel / Tümü</option>
              <option value="day">Günlük (bugün)</option>
              <option value="month">Aylık (bu ay)</option>
              <option value="year">Yıllık (bu yıl)</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kategori</Label>
            <select className="field-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Tümü</option>
              {categories.filter((c) => c.active).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kampanya</Label>
            <select className="field-select" value={announcementId} onChange={(e) => setAnnouncementId(e.target.value)}>
              <option value="">Tümü</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mağaza</Label>
            <select className="field-select" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              <option value="">Tümü</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bağlantı</Label>
            <select className="field-select" value={link} onChange={(e) => setLink(e.target.value as typeof link)}>
              <option value="all">Tümü</option>
              <option value="campaign">Kampanyaya bağlı</option>
              <option value="general">Kampanya dışı</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Başlangıç</Label>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPeriod(""); }} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bitiş</Label>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPeriod(""); }} />
          </div>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Özet — {summary.count} kayıt · {formatMoney(summary.grandTotal)} TL
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2">Kampanya</th>
                  <th className="px-3 py-2">Mağaza</th>
                  <th className="px-3 py-2">Satır</th>
                  <th className="px-3 py-2">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {summary.byCampaignStore.map((row) => (
                  <tr key={`${row.announcementId}-${row.storeId}`} className="border-t">
                    <td className="px-3 py-2">{row.announcementTitle}</td>
                    <td className="px-3 py-2">{row.storeName}</td>
                    <td className="px-3 py-2">{row.count}</td>
                    <td className="px-3 py-2 font-medium">{formatMoney(row.total)} TL</td>
                  </tr>
                ))}
                {!summary.byCampaignStore.length && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Kayıt yok</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gider Listesi</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Tarih</th>
                <th className="px-3 py-2">Mağaza</th>
                <th className="px-3 py-2">Kategori</th>
                <th className="px-3 py-2">Kampanya</th>
                <th className="px-3 py-2">Başlık</th>
                <th className="px-3 py-2">Adet</th>
                <th className="px-3 py-2">Toplam</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="px-3 py-2">{new Date(e.expenseDate).toLocaleDateString("tr-TR")}</td>
                  <td className="px-3 py-2">{e.store.name}</td>
                  <td className="px-3 py-2">{e.category.name}</td>
                  <td className="px-3 py-2">{e.announcement?.title ?? "—"}</td>
                  <td className="px-3 py-2">{e.title}</td>
                  <td className="px-3 py-2">{e.quantity}</td>
                  <td className="px-3 py-2 font-medium">{formatMoney(e.totalPrice)} TL</td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="ghost" onClick={() => deleteExpense(e.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!expenses.length && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Kayıt yok</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

type DraftLine = {
  key: string;
  categoryId: string;
  announcementId: string;
  title: string;
  quantity: string;
  totalPrice: string;
  expenseDate: string;
  note: string;
};

function emptyDraft(): DraftLine {
  return {
    key: Math.random().toString(36).slice(2),
    categoryId: "",
    announcementId: "",
    title: "",
    quantity: "1",
    totalPrice: "",
    expenseDate: todayISO(),
    note: "",
  };
}

export function StoreAdExpensesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [drafts, setDrafts] = useState<DraftLine[]>([emptyDraft()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [catsRes, campsRes, listRes] = await Promise.all([
      fetch("/api/v1/admin/ad-expense-categories"),
      fetch("/api/v1/ad-expenses?campaigns=1"),
      fetch("/api/v1/ad-expenses"),
    ]);
    const [cats, camps, list] = await Promise.all([
      catsRes.json().catch(() => null),
      campsRes.json().catch(() => null),
      listRes.json().catch(() => null),
    ]);
    if (!catsRes.ok || !campsRes.ok || !listRes.ok) {
      setError(
        cats?.error || camps?.error || list?.error || "Veriler yüklenemedi (şema güncellemesi gerekebilir)"
      );
      setCategories([]);
      setCampaigns([]);
      setExpenses([]);
      return;
    }
    setError("");
    setCategories(Array.isArray(cats) ? cats : []);
    setCampaigns(Array.isArray(camps) ? camps : []);
    setExpenses(Array.isArray(list) ? list : []);
  }

  useEffect(() => {
    load();
  }, []);

  function updateDraft(key: string, patch: Partial<DraftLine>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const items = drafts.map((d) => ({
        categoryId: d.categoryId,
        announcementId: d.announcementId || null,
        title: d.title.trim(),
        quantity: Number(d.quantity),
        totalPrice: Number(d.totalPrice),
        expenseDate: d.expenseDate,
        note: d.note.trim() || null,
      }));
      const res = await fetch("/api/v1/ad-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Kaydedilemedi");
        return;
      }
      setDrafts([emptyDraft()]);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function removeExpense(id: string) {
    if (!confirm("Bu gider silinsin mi?")) return;
    await fetch(`/api/v1/ad-expenses/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reklam Giderleri"
        subtitle="Kampanya veya bağımsız reklam gideri ekleyin — satır satır Ekle, sonra Tamamla"
      />
      {error ? <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Yeni Gider Satırları</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {drafts.map((d, idx) => (
              <div key={d.key} className="space-y-3 rounded-xl border bg-secondary/10 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Satır {idx + 1}</span>
                  {drafts.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDrafts((prev) => prev.filter((x) => x.key !== d.key))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Kategori</Label>
                    <select
                      className="field-select"
                      required
                      value={d.categoryId}
                      onChange={(e) => updateDraft(d.key, { categoryId: e.target.value })}
                    >
                      <option value="">Seçin</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Kampanya (opsiyonel)</Label>
                    <select
                      className="field-select"
                      value={d.announcementId}
                      onChange={(e) => updateDraft(d.key, { announcementId: e.target.value })}
                    >
                      <option value="">Kampanya dışı</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Başlık</Label>
                    <Input
                      required
                      placeholder="Örn. A5 pleks"
                      value={d.title}
                      onChange={(e) => updateDraft(d.key, { title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Adet</Label>
                    <Input
                      type="number"
                      min={1}
                      required
                      value={d.quantity}
                      onChange={(e) => updateDraft(d.key, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Toplam fiyat (TL)</Label>
                    <Input
                      type="number"
                      min={0.01}
                      step="0.01"
                      required
                      value={d.totalPrice}
                      onChange={(e) => updateDraft(d.key, { totalPrice: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tarih</Label>
                    <Input
                      type="date"
                      required
                      value={d.expenseDate}
                      onChange={(e) => updateDraft(d.key, { expenseDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Not</Label>
                    <Input value={d.note} onChange={(e) => updateDraft(d.key, { note: e.target.value })} />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setDrafts((prev) => [...prev, emptyDraft()])}>
                <Plus className="mr-1 h-4 w-4" /> Satır Ekle
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Kaydediliyor..." : "Tamamla / Kaydet"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Geçmiş Giderlerim</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {expenses.map((e) => (
            <div key={e.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border p-3 text-sm">
              <div>
                <p className="font-medium">{e.title}</p>
                <p className="text-muted-foreground">
                  {e.category.name}
                  {e.announcement ? ` · ${e.announcement.title}` : " · Kampanya dışı"} · {e.quantity} adet ·{" "}
                  {new Date(e.expenseDate).toLocaleDateString("tr-TR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{formatMoney(e.totalPrice)} TL</span>
                <Button size="sm" variant="ghost" onClick={() => removeExpense(e.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {!expenses.length && <p className="text-sm text-muted-foreground">Henüz gider yok.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
