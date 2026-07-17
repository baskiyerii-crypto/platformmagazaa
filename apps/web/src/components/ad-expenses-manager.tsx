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
type Campaign = { id: string; title: string; name?: string };
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
  catalogCampaign?: { id: string; name: string } | null;
  catalogCampaignId?: string | null;
  announcementId?: string | null;
  createdBy: { username: string };
};
type Summary = {
  grandTotal: number;
  count: number;
  byCampaignStore: Array<{
    catalogCampaignId: string | null;
    announcementId: string | null;
    campaignTitle: string;
    announcementTitle: string;
    storeId: string;
    storeName: string;
    total: number;
    count: number;
  }>;
};

function expenseCampaignLabel(e: Expense) {
  return e.catalogCampaign?.name ?? e.announcement?.title ?? null;
}

function isLinkedExpense(e: Expense) {
  return Boolean(e.catalogCampaign?.id || e.catalogCampaignId || e.announcement?.id || e.announcementId);
}

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
  const [catalogCampaignId, setCatalogCampaignId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (period) p.set("period", period);
    if (categoryId) p.set("categoryId", categoryId);
    if (catalogCampaignId) p.set("catalogCampaignId", catalogCampaignId);
    if (storeId) p.set("storeId", storeId);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    return p.toString();
  }, [period, categoryId, catalogCampaignId, storeId, dateFrom, dateTo]);

  const campaignExpenses = useMemo(
    () => expenses.filter(isLinkedExpense),
    [expenses]
  );
  const specialExpenses = useMemo(
    () => expenses.filter((e) => !isLinkedExpense(e)),
    [expenses]
  );
  const campaignSummaryRows = useMemo(
    () =>
      (summary?.byCampaignStore ?? []).filter(
        (r) => r.catalogCampaignId || r.announcementId
      ),
    [summary]
  );
  const specialSummaryRows = useMemo(
    () =>
      (summary?.byCampaignStore ?? []).filter(
        (r) => !r.catalogCampaignId && !r.announcementId
      ),
    [summary]
  );
  const campaignTotal = useMemo(
    () => campaignExpenses.reduce((s, e) => s + e.totalPrice, 0),
    [campaignExpenses]
  );
  const specialTotal = useMemo(
    () => specialExpenses.reduce((s, e) => s + e.totalPrice, 0),
    [specialExpenses]
  );

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

  function downloadExcel(link?: "campaign" | "general") {
    const p = new URLSearchParams();
    if (period) p.set("period", period);
    if (categoryId) p.set("categoryId", categoryId);
    if (storeId) p.set("storeId", storeId);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    // Kampanya listesi: seçili kampanya filtresi geçerli
    // Özel gider: kampanya ID gönderilmez (çakışmasın)
    if (link === "campaign" && catalogCampaignId) {
      p.set("catalogCampaignId", catalogCampaignId);
    }
    if (link) p.set("link", link);
    p.set("format", "excel");
    window.open(`/api/v1/admin/export/ad-expenses?${p.toString()}`, "_blank");
  }

  function ExpenseTable({ rows, showCampaign }: { rows: Expense[]; showCampaign: boolean }) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Tarih</th>
              <th className="px-3 py-2">Mağaza</th>
              <th className="px-3 py-2">Kategori</th>
              {showCampaign ? <th className="px-3 py-2">Kampanya</th> : null}
              <th className="px-3 py-2">Başlık</th>
              <th className="px-3 py-2">Adet</th>
              <th className="px-3 py-2">Toplam</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="px-3 py-2">{new Date(e.expenseDate).toLocaleDateString("tr-TR")}</td>
                <td className="px-3 py-2">{e.store.name}</td>
                <td className="px-3 py-2">{e.category.name}</td>
                {showCampaign ? <td className="px-3 py-2">{expenseCampaignLabel(e) ?? "—"}</td> : null}
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
            {!rows.length && (
              <tr>
                <td colSpan={showCampaign ? 8 : 7} className="px-3 py-6 text-center text-muted-foreground">
                  Kayıt yok
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reklam Giderleri"
        subtitle="Kampanya ve özel (kampanya dışı) giderler ayrı listelenir"
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
          <CardTitle className="text-base">Filtreler</CardTitle>
          <p className="text-xs text-muted-foreground">Excel indirmeleri her listenin kendi kartında</p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Dönem</Label>
            <select className="field-select" value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
              <option value="">Özel tarih / Tümü</option>
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
            <Label className="text-xs">Kampanya (Kampanya Yönetimi)</Label>
            <select
              className="field-select"
              value={catalogCampaignId}
              onChange={(e) => setCatalogCampaignId(e.target.value)}
            >
              <option value="">Tüm kampanyalar</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.title || c.name}</option>
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
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Kampanya özeti — {campaignExpenses.length} kayıt · {formatMoney(campaignTotal)} TL
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
                  {campaignSummaryRows.map((row) => (
                    <tr
                      key={`${row.catalogCampaignId ?? row.announcementId}-${row.storeId}`}
                      className="border-t"
                    >
                      <td className="px-3 py-2">{row.campaignTitle || row.announcementTitle}</td>
                      <td className="px-3 py-2">{row.storeName}</td>
                      <td className="px-3 py-2">{row.count}</td>
                      <td className="px-3 py-2 font-medium">{formatMoney(row.total)} TL</td>
                    </tr>
                  ))}
                  {!campaignSummaryRows.length && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Kampanya gideri yok</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Özel gider özeti — {specialExpenses.length} kayıt · {formatMoney(specialTotal)} TL
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2">Tür</th>
                    <th className="px-3 py-2">Mağaza</th>
                    <th className="px-3 py-2">Satır</th>
                    <th className="px-3 py-2">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {specialSummaryRows.map((row) => (
                    <tr key={`ozel-${row.storeId}`} className="border-t">
                      <td className="px-3 py-2">Özel (kampanya dışı)</td>
                      <td className="px-3 py-2">{row.storeName}</td>
                      <td className="px-3 py-2">{row.count}</td>
                      <td className="px-3 py-2 font-medium">{formatMoney(row.total)} TL</td>
                    </tr>
                  ))}
                  {!specialSummaryRows.length && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Özel gider yok</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Kampanya Giderleri</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {campaignExpenses.length} satır · {formatMoney(campaignTotal)} TL
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Kampanya</Badge>
            <Button size="sm" onClick={() => downloadExcel("campaign")}>
              <Download className="mr-1 h-4 w-4" /> Kampanya Raporu İndir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ExpenseTable rows={campaignExpenses} showCampaign />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Özel Giderler</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Kampanya dışı reklam giderleri · {specialExpenses.length} satır · {formatMoney(specialTotal)} TL
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Özel</Badge>
            <Button size="sm" variant="secondary" onClick={() => downloadExcel("general")}>
              <Download className="mr-1 h-4 w-4" /> Özel Rapor İndir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ExpenseTable rows={specialExpenses} showCampaign={false} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => downloadExcel()}>
          <Download className="mr-1 h-4 w-4" /> Tüm Giderleri Birlikte İndir
        </Button>
      </div>
    </div>
  );
}

type DraftLine = {
  key: string;
  categoryId: string;
  catalogCampaignId: string;
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
    catalogCampaignId: "",
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
        catalogCampaignId: d.catalogCampaignId || null,
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
        subtitle="Kampanyalar Kampanya Yönetimi’nden gelir — seçip gider ekleyin veya kampanya dışı bırakın"
      />
      {error ? <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Yeni Gider Satırları</CardTitle>
          {campaigns.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Henüz aktif kampanya yok. Yönetici Kampanya Yönetimi’nden kampanya eklemeli.
            </p>
          ) : null}
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
                      value={d.catalogCampaignId}
                      onChange={(e) => updateDraft(d.key, { catalogCampaignId: e.target.value })}
                    >
                      <option value="">Kampanya dışı</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>{c.title || c.name}</option>
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
                  {expenseCampaignLabel(e)
                    ? ` · ${expenseCampaignLabel(e)}`
                    : " · Kampanya dışı"}{" "}
                  · {e.quantity} adet ·{" "}
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
