import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { colors } from "@/components/theme";
import { useRouter } from "expo-router";
import { Screen, StatCard, SecondaryButton, styles } from "@/components/ui";
import { NavHub } from "@/components/nav-hub";
import { api, clearAuth } from "@/lib/auth";
import { STORE_MENU } from "@/lib/menus";

type DashboardData = {
  openRequests: number;
  vitrinCount: number;
  outdoorCount: number;
};

const STORE_LINKS = [
  { href: "/store/inventory", label: "Envanter Özeti", desc: "AVM, açık hava, katalog" },
  { href: "/store/avm", label: "AVM Alanları", desc: "Vitrin kayıtları" },
  { href: "/store/outdoor", label: "Açık Hava", desc: "Dış mekan alanları" },
  { href: "/store/catalog", label: "Ürün Talepleri", desc: "Katalog ürünleri" },
  { href: "/store/announcements", label: "Duyurular", desc: "Okundu / işleme / tamamla" },
  { href: "/store/ad-expenses", label: "Reklam Giderleri", desc: "Kampanya ve reklam harcamaları" },
  { href: "/store/support", label: "Destek", desc: "Yöneticiye mesaj" },
  { href: "/store/requests", label: "Değişim Talepleri", desc: "Görsel değişimleri" },
  { href: "/notifications", label: "Bildirimler", desc: "Push bildirimleri" },
];

export default function StoreHome() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCached<DashboardData>("/api/v1/dashboard", 60_000)
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await clearAuth();
    router.replace("/login");
  }

  return (
    <Screen title="Mağaza Paneli" subtitle="Envanter özeti" menuItems={STORE_MENU}>
      {loading && !data ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
      ) : null}
      <View style={styles.row}>
        <StatCard label="Vitrin" value={data?.vitrinCount ?? 0} />
        <StatCard label="Açık Hava" value={data?.outdoorCount ?? 0} />
        <StatCard label="Açık Talep" value={data?.openRequests ?? 0} />
      </View>
      <NavHub items={STORE_LINKS} />
      <View style={{ marginTop: 24 }}>
        <SecondaryButton label="Çıkış Yap" onPress={logout} />
      </View>
    </Screen>
  );
}
