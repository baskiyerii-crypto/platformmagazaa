import { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, StatCard, SecondaryButton, styles } from "@/components/ui";
import { NavHub } from "@/components/nav-hub";
import { api, clearAuth, getUser } from "@/lib/auth";
import { ADMIN_MENU } from "@/lib/menus";
import { USER_ROLE_LABELS } from "@magaza/shared";
import type { UserRole } from "@magaza/shared";

type DashboardData = {
  storeCount: number;
  openRequests: number;
  vitrinCount: number;
  outdoorCount: number;
};

const ADMIN_LINKS = [
  { href: "/admin/inventory", label: "Envanter", desc: "Tüm mağaza kayıtları" },
  { href: "/admin/catalog", label: "Ürün Kataloğu", desc: "Katalog yönetimi" },
  { href: "/admin/stores", label: "Mağazalar", desc: "Mağaza ve kullanıcılar" },
  { href: "/admin/announcements", label: "Duyurular", desc: "Yayınla ve takip et" },
  { href: "/admin/ad-expenses", label: "Reklam Giderleri", desc: "Kampanya ve gider raporları" },
  { href: "/admin/media", label: "Görsel Kütüphanesi", desc: "Yüklenen görseller" },
  { href: "/admin/support", label: "Destek", desc: "Mağaza destek talepleri" },
  { href: "/admin/definitions", label: "Tanımlar", desc: "Alt türler ve yerleşimler" },
  { href: "/admin/requests", label: "Talepler", desc: "Değişim talepleri" },
  { href: "/admin/export", label: "Excel Export", desc: "Veri indir" },
  { href: "/notifications", label: "Bildirimler", desc: "Push ve uygulama içi" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [role, setRole] = useState<UserRole>("ADMIN");

  useEffect(() => {
    getUser().then((user) => {
      if (user?.role === "ADMIN" || user?.role === "MANAGER") {
        setRole(user.role);
      }
    });
    api.get<DashboardData>("/api/v1/dashboard").catch(() => null).then(setData);
  }, []);

  async function logout() {
    await clearAuth();
    router.replace("/login");
  }

  const panelTitle = role === "MANAGER" ? "Müdür Paneli" : "Ana Yönetici Paneli";

  return (
    <Screen title={panelTitle} subtitle={`${USER_ROLE_LABELS[role]} · mobil özet`} menuItems={ADMIN_MENU}>
      <View style={styles.row}>
        <StatCard label="Mağaza" value={data?.storeCount ?? 0} />
        <StatCard label="Açık Talep" value={data?.openRequests ?? 0} />
        <StatCard label="Vitrin" value={data?.vitrinCount ?? 0} />
        <StatCard label="Açık Hava" value={data?.outdoorCount ?? 0} />
      </View>
      <NavHub items={ADMIN_LINKS} />
      <View style={{ marginTop: 24 }}>
        <SecondaryButton label="Çıkış Yap" onPress={logout} />
      </View>
    </Screen>
  );
}
