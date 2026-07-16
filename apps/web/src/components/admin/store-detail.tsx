"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useIsStrictAdmin, useUserRole } from "@/lib/role-context";
import { isStaffRole, changeTargetTypeLabel } from "@magaza/shared";
import { ArrowLeft, Trash2, KeyRound, Pencil, Save } from "lucide-react";
import { thumbUrl } from "@magaza/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import type { ChangeRequestStatus } from "@magaza/shared";

type StoreUser = { id: string; username: string; createdAt?: string };

type StoreDetailData = {
  id: string;
  name: string;
  storeNumber: string;
  address?: string | null;
  active: boolean;
  users: StoreUser[];
  avmEntries: Array<{
    id: string;
    subType: { name: string; code: string };
    vitrins: Array<{ siraNo: number; en: number; boy: number; camEn?: number | null; camBoy?: number | null; gorselUrl?: string | null }>;
    videos: Array<{ adet: number; placement: { name: string } }>;
  }>;
  outdoorEntries: Array<{
    id: string;
    subType: { name: string };
    en: number;
    boy: number;
    adet: number;
    gorselUrl?: string | null;
  }>;
  changeRequests: Array<{ id: string; status: ChangeRequestStatus; targetType: string }>;
};

export function StoreDetail({ storeId }: { storeId: string }) {
  const router = useRouter();
  const isAdmin = useIsStrictAdmin();
  const canManage = isStaffRole(useUserRole());
  const [store, setStore] = useState<StoreDetailData | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStoreNumber, setEditStoreNumber] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editActive, setEditActive] = useState(true);

  async function load() {
    const res = await fetch(`/api/v1/admin/stores/${storeId}?full=1`);
    setStore(await res.json());
  }

  useEffect(() => {
    load();
  }, [storeId]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);
    await fetch(`/api/v1/admin/stores/${storeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setUsername("");
    setPassword("");
    await load();
    setLoading(false);
  }

  async function deleteUser(userId: string) {
    if (!isAdmin || !confirm("Kullanıcı silinsin mi?")) return;
    await fetch(`/api/v1/admin/stores/${storeId}/users/${userId}`, { method: "DELETE" });
    await load();
  }

  async function resetPassword(userId: string) {
    if (!isAdmin) return;
    const newPassword = prompt("Yeni şifre:");
    if (!newPassword) return;
    await fetch(`/api/v1/admin/stores/${storeId}/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    alert("Şifre güncellendi");
  }

  async function saveStore(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setLoading(true);
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
      alert(data.error ?? "Mağaza güncellenemedi");
      setLoading(false);
      return;
    }
    setEditing(false);
    await load();
    setLoading(false);
  }

  async function deleteStore() {
    if (!canManage || !store || !confirm(`"${store.name}" mağazası silinsin mi?`)) return;
    const res = await fetch(`/api/v1/admin/stores/${storeId}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Mağaza silinemedi");
      return;
    }
    router.push("/admin/stores");
  }

  if (!store) return <div>Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost">
        <Link href="/admin/stores"><ArrowLeft className="mr-2 h-4 w-4" /> Mağazalar</Link>
      </Button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{store.name}</h1>
          <p className="text-muted-foreground">Mağaza No: {store.storeNumber}</p>
          <p className="text-muted-foreground">{store.address}</p>
          <p className="text-sm text-muted-foreground">{store.active ? "Aktif" : "Pasif"}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(!editing);
                setEditName(store.name);
                setEditStoreNumber(store.storeNumber);
                setEditAddress(store.address ?? "");
                setEditActive(store.active);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Düzenle
            </Button>
            <Button variant="destructive" size="sm" onClick={deleteStore}>
              <Trash2 className="mr-2 h-4 w-4" />
              Sil
            </Button>
          </div>
        )}
      </div>

      {editing && canManage && (
        <Card>
          <CardHeader><CardTitle>Mağaza Bilgileri</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={saveStore} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Mağaza Adı</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Mağaza No</Label>
                <Input
                  value={editStoreNumber}
                  onChange={(e) => setEditStoreNumber(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Adres</Label>
                <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Aktif mağaza
              </label>
              <div className="md:col-span-2">
                <Button type="submit" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Mağaza Kullanıcıları</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {store.users.length === 0 && (
            <p className="text-sm text-muted-foreground">Henüz kullanıcı yok</p>
          )}
          {store.users.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <div className="font-medium">{user.username}</div>
                {user.createdAt && (
                  <div className="text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => resetPassword(user.id)}>
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteUser(user.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          {isAdmin && (
            <form onSubmit={createUser} className="grid gap-3 md:grid-cols-3 border-t pt-4">
              <div className="space-y-2">
                <Label>Kullanıcı Adı</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Şifre</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={loading}>Kullanıcı Ekle</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>AVM Alanları</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {store.avmEntries.map((entry) => (
            <div key={entry.id} className="rounded-xl border p-4">
              <h3 className="font-semibold">{entry.subType.name}</h3>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                {entry.vitrins.map((v) => (
                  <div key={v.siraNo} className="rounded-lg bg-secondary p-3 text-sm">
                    <div>Vitrin {v.siraNo}: {v.en}×{v.boy} cm</div>
                    {v.camEn && v.camBoy && <div>Cam: {v.camEn}×{v.camBoy} cm</div>}
                    {v.gorselUrl && (
                      <Image src={thumbUrl(v.gorselUrl) ?? v.gorselUrl} alt="" width={200} height={96} className="mt-2 h-24 w-full rounded-lg object-cover" unoptimized />
                    )}
                  </div>
                ))}
              </div>
              {entry.videos.length > 0 && (
                <p className="mt-2 text-sm">Video: {entry.videos.map((v) => `${v.adet}x ${v.placement.name}`).join(", ")}</p>
              )}
            </div>
          ))}
          {!store.avmEntries.length && <p className="text-sm text-muted-foreground">Kayıt yok</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Açık Hava</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {store.outdoorEntries.map((entry) => (
            <div key={entry.id} className="rounded-xl border p-4 text-sm">
              <div>{entry.subType.name}: {entry.en}×{entry.boy} cm · {entry.adet} adet</div>
              {entry.gorselUrl && (
                <Image src={thumbUrl(entry.gorselUrl) ?? entry.gorselUrl} alt="" width={200} height={96} className="mt-2 h-24 rounded-lg object-cover" unoptimized />
              )}
            </div>
          ))}
          {!store.outdoorEntries.length && <p className="text-sm text-muted-foreground">Kayıt yok</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Talepler</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {store.changeRequests.map((req) => (
            <div key={req.id} className="flex items-center justify-between rounded-xl border p-3">
              <span className="text-sm">{changeTargetTypeLabel(req.targetType)}</span>
              <StatusBadge status={req.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
