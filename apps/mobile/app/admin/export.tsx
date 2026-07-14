import { useEffect, useState } from "react";
import { Text, Alert, View, Pressable } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Screen, Card, PrimaryButton, styles } from "@/components/ui";
import { colors, spacing } from "@/components/theme";
import { getToken, getUser, api } from "@/lib/auth";
import { ADMIN_MENU } from "@/lib/menus";
import { API_URL } from "@/lib/config";

type Store = { id: string; name: string };

export default function AdminExport() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    getUser().then((u) => setIsStaff(u?.role === "ADMIN" || u?.role === "MANAGER"));
    api.getCached<Store[]>("/api/v1/admin/stores?slim=1", 120_000).then(setStores).catch(() => {});
  }, []);

  async function downloadExcel() {
    setLoading(true);
    try {
      const token = await getToken();
      const params = storeId ? `?storeId=${storeId}` : "";
      const filename = storeId
        ? `magaza-export-${storeId}.xlsx`
        : `magaza-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      const path = `${FileSystem.cacheDirectory}${filename}`;
      const result = await FileSystem.downloadAsync(
        `${API_URL}/api/v1/admin/export/excel${params}`,
        path,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      if (result.status !== 200) {
        throw new Error("Excel dosyası indirilemedi");
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Excel dosyasını kaydet",
        });
      } else {
        Alert.alert("Başarılı", `Dosya kaydedildi: ${result.uri}`);
      }
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "İndirilemedi");
    } finally {
      setLoading(false);
    }
  }

  if (!isStaff) {
    return (
      <Screen title="Excel Export" subtitle="Yetkiniz yok" menuItems={ADMIN_MENU}>
        <Text style={styles.cardBody}>Bu sayfaya erişim yetkiniz bulunmuyor.</Text>
      </Screen>
    );
  }

  return (
    <Screen title="Excel Export" subtitle="AVM, açık hava ve talep verileri" menuItems={ADMIN_MENU}>
      <Card>
        <Text style={styles.cardTitle}>Mağaza Seçimi</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginVertical: spacing.md }}>
          <Pressable
            onPress={() => setStoreId("")}
            style={{ padding: 10, borderRadius: 8, backgroundColor: !storeId ? colors.primary : colors.bgCard }}
          >
            <Text style={{ color: colors.text }}>Tüm Mağazalar</Text>
          </Pressable>
          {stores.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => setStoreId(s.id)}
              style={{ padding: 10, borderRadius: 8, backgroundColor: storeId === s.id ? colors.primary : colors.bgCard }}
            >
              <Text style={{ color: colors.text }}>{s.name}</Text>
            </Pressable>
          ))}
        </View>
        <PrimaryButton label={loading ? "İndiriliyor..." : "Excel İndir"} onPress={downloadExcel} loading={loading} />
        <Text style={[styles.cardBody, { marginTop: spacing.md }]}>
          Dosyada AVM Ücretsiz, AVM Ücretli, Açık Hava ve Talepler sayfaları bulunur.
        </Text>
      </Card>
    </Screen>
  );
}
