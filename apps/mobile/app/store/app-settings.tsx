import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, PrimaryButton, styles } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { ADMIN_MENU, STORE_MENU } from "@/lib/menus";

export default function AppSettings() {
  const router = useRouter();
  const [staff, setStaff] = useState(false);

  useEffect(() => {
    getUser().then((u) => setStaff(u?.role === "ADMIN" || u?.role === "MANAGER"));
  }, []);

  return (
    <Screen
      title="Uygulama Ayarları"
      subtitle="Ana ekran ve bildirimler"
      menuItems={staff ? ADMIN_MENU : STORE_MENU}
    >
      <Card>
        <Text style={styles.cardTitle}>Ana ekrana ekle</Text>
        <Text style={styles.cardBody}>
          Bu mobil uygulama zaten yüklü. Web tarayıcısında masaüstü/ana ekran kısayolu için paneldeki
          Uygulama Ayarları sayfasındaki “Ana ekrana ekle” butonunu kullanın.
        </Text>
      </Card>
      <Card>
        <Text style={styles.cardTitle}>Bildirimler</Text>
        <Text style={styles.cardBody}>
          Web’de bildirim aç/kapa Uygulama Ayarları’ndan yapılır. Buradan bildirim listesine
          gidebilirsiniz.
        </Text>
        <PrimaryButton label="Bildirimler" onPress={() => router.push("/notifications")} />
      </Card>
    </Screen>
  );
}
