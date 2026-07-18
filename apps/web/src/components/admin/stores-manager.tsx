"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useIsStrictAdmin, useUserRole } from "@/lib/role-context";
import { isStaffRole } from "@magaza/shared";
import {
  Plus,
  Trash2,
  KeyRound,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Pencil,
  Save,
  X,
  Download,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { downloadExcelBlob } from "@/lib/download-excel";

type StoreUser = { id: string; username: string; createdAt?: string };

type Store = {
  id: string;
  name: string;
  storeNumber: string;
  address?: string | null;
  active: boolean;
  users: StoreUser[];
  _count: { avmEntries: number; outdoorEntries: number; changeRequests: number };
};

type ImportResult = {
  created: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
};

export function StoresManager() {
  const isAdmin = useIsStrictAdmin();
  const role = useUserRole();
  const canManage = isStaffRole(role);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  const [name, setName] = useState("");
  const [storeNumber, setStoreNumber] = useState("");
  const [address, setAddress] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [addingUserFor, setAddingUserFor] = useState<string | null>(null);
  const [extraUsername, setExtraUsername] = useState("");
  const [extraPassword, setExtraPassword] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editStoreNumber, setEditStoreNumber] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editActive, setEditActive] = useState(true);

  async function loadStores() {
    const res = await fetch("/api/v1/admin/stores");
    if (!res.ok) {
      setStores([]);
      return;
    }
    setStores(await res.json());
  }

  useEffect(() => {
    loadStores();
  }, []);

  async function createStoreWithUser(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/v1/admin/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        storeNumber,
        address,
        active: true,
        username,
        password,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Mağaza oluşturulamadı");
      setLoading(false);
      return;
    }

    setName("");
    setStoreNumber("");
    setAddress("");
    setUsername("");
    setPassword("");
    await loadStores();
    setLoading(false);
  }

  async function downloadTemplate() {
    const res = await fetch("/api/v1/admin/stores/import-template", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Şablon indirilemedi");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "magaza-toplu-sablon.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadStoresExcel() {
    setLoading(true);
    setError("");
    try {
      await downloadExcelBlob(
        "/api/v1/admin/export/stores",
        `magazalar-${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mağaza listesi indirilemedi");
    } finally {
      setLoading(false);
    }
  }

  async function handleImportFile(file: File) {
    if (!isAdmin) return;
    setImporting(true);
    setError("");
    setImportResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/v1/admin/stores/import", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((data as { error?: string } | null)?.error ?? "İçe aktarma başarısız");
      }
      setImportResult(data as ImportResult);
      await loadStores();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İçe aktarma başarısız");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function addUserToStore(e: React.FormEvent, storeId: string) {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);
    setError("");

    const res = await fetch(`/api/v1/admin/stores/${storeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: extraUsername, password: extraPassword }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Kullanıcı eklenemedi");
      setLoading(false);
      return;
    }

    setExtraUsername("");
    setExtraPassword("");
    setAddingUserFor(null);
    await loadStores();
    setLoading(false);
  }

  async function deleteUser(storeId: string, userId: string) {
    if (!isAdmin || !confirm("Kullanıcı silinsin mi?")) return;
    const res = await fetch(`/api/v1/admin/stores/${storeId}/users/${userId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Kullanıcı silinemedi");
      return;
    }
    await loadStores();
  }

  async function resetPassword(storeId: string, userId: string) {
    if (!isAdmin) return;
    const newPassword = prompt("Yeni şifre:");
    if (!newPassword) return;
    const res = await fetch(`/api/v1/admin/stores/${storeId}/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Şifre güncellenemedi");
      return;
    }
    alert("Şifre güncellendi");
  }

  function startEdit(store: Store) {
    setEditingId(store.id);
    setEditName(store.name);
    setEditStoreNumber(store.storeNumber);
    setEditAddress(store.address ?? "");
    setEditActive(store.active);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditStoreNumber("");
    setEditAddress("");
    setEditActive(true);
  }

  async function saveStore(e: React.FormEvent, storeId: string) {
    e.preventDefault();
    if (!canManage) return;
    setLoading(true);
    setError("");

    const res = await fetch(`/api/v1/admin/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        storeNumber: editStoreNumber,
        address: editAddress || null,
        active: editActive,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Mağaza güncellenemedi");
      setLoading(false);
      return;
    }

    cancelEdit();
    await loadStores();
    setLoading(false);
  }

  async function deleteStore(storeId: string, storeName: string) {
    if (!canManage || !confirm(`"${storeName}" mağazası ve tüm verileri silinsin mi?`)) return;
    setLoading(true);
    setError("");

    const res = await fetch(`/api/v1/admin/stores/${storeId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Mağaza silinemedi");
      setLoading(false);
      return;
    }

    if (editingId === storeId) cancelEdit();
    await loadStores();
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mağazalar"
        subtitle="Mağaza ve kullanıcı yönetimi"
        action={
          canManage ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void downloadStoresExcel()}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Mağazaları Excel İndir
            </Button>
          ) : undefined
        }
      />

      {isAdmin && (
        <section className="panel-section space-y-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Yeni Mağaza Ekle</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="mr-1.5 h-4 w-4" />
                Şablon İndir
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={importing}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                {importing ? "İçe aktarılıyor..." : "Excel ile Toplu Ekle"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                }}
              />
            </div>
          </div>

          {importResult ? (
            <div className="rounded-xl border bg-muted/30 p-4 text-sm">
              <p>
                Oluşturulan: <strong>{importResult.created}</strong> · Atlanan:{" "}
                <strong>{importResult.skipped}</strong>
              </p>
              {importResult.errors.length > 0 ? (
                <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-destructive">
                  {importResult.errors.map((err) => (
                    <li key={`${err.row}-${err.message}`}>
                      Satır {err.row}: {err.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <form onSubmit={createStoreWithUser} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mağaza Adı *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Kadıköy Şubesi"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mağaza No *</Label>
              <Input
                value={storeNumber}
                onChange={(e) => setStoreNumber(e.target.value)}
                placeholder="Örn: 001"
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Adres</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Opsiyonel" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Kullanıcı Adı *</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="magaza_kullanici"
                required
                minLength={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Şifre *</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 6 karakter"
                required
                minLength={6}
              />
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                {loading ? "Kaydediliyor..." : "Mağaza ve Kullanıcı Oluştur"}
              </Button>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          </form>
        </section>
      )}

      {!isAdmin && error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4">
        {stores.map((store) => (
          <Card key={store.id}>
            <CardContent className="flex flex-col gap-4 p-6">
              {editingId === store.id ? (
                <form onSubmit={(e) => saveStore(e, store.id)} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Mağazayı Düzenle</h3>
                    <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Mağaza Adı *</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Mağaza No *</Label>
                      <Input
                        value={editStoreNumber}
                        onChange={(e) => setEditStoreNumber(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Adres</Label>
                      <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    Aktif mağaza
                  </label>
                  <Button type="submit" disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </form>
              ) : (
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{store.name}</h3>
                      <Badge variant="outline">No: {store.storeNumber}</Badge>
                      <Badge variant={store.active ? "default" : "secondary"}>
                        {store.active ? "Aktif" : "Pasif"}
                      </Badge>
                    </div>
                    {store.address ? <p className="text-sm text-muted-foreground">{store.address}</p> : null}
                    <p className="text-sm text-muted-foreground">
                      AVM: {store._count.avmEntries} · Açık Hava: {store._count.outdoorEntries} · Talep:{" "}
                      {store._count.changeRequests}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canManage && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => startEdit(store)}>
                          <Pencil className="mr-1.5 h-4 w-4" />
                          Düzenle
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteStore(store.id, store.name)}
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" />
                          Sil
                        </Button>
                      </>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/stores/${store.id}`}>Detay</Link>
                    </Button>
                  </div>
                </div>
              )}

              {editingId !== store.id && (
                <div className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Kullanıcılar ({store.users.length})</h4>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAddingUserFor(addingUserFor === store.id ? null : store.id);
                          setExtraUsername("");
                          setExtraPassword("");
                          setError("");
                        }}
                      >
                        <UserPlus className="mr-1.5 h-4 w-4" />
                        Kullanıcı Ekle
                        {addingUserFor === store.id ? (
                          <ChevronUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="ml-1 h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>

                  {isAdmin && addingUserFor === store.id && (
                    <form
                      onSubmit={(e) => addUserToStore(e, store.id)}
                      className="mb-4 grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2"
                    >
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Kullanıcı Adı</Label>
                        <Input
                          value={extraUsername}
                          onChange={(e) => setExtraUsername(e.target.value)}
                          placeholder="yeni_kullanici"
                          required
                          minLength={3}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Şifre</Label>
                        <Input
                          type="password"
                          value={extraPassword}
                          onChange={(e) => setExtraPassword(e.target.value)}
                          placeholder="En az 6 karakter"
                          required
                          minLength={6}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Button type="submit" size="sm" disabled={loading}>
                          {loading ? "Ekleniyor..." : "Bu Mağazaya Ekle"}
                        </Button>
                      </div>
                    </form>
                  )}

                  {store.users.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Henüz kullanıcı yok</p>
                  ) : (
                    <div className="space-y-2">
                      {store.users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm"
                        >
                          <span>{user.username}</span>
                          {isAdmin && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resetPassword(store.id, user.id)}
                                title="Şifre sıfırla"
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteUser(store.id, user.id)}
                                title="Sil"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
