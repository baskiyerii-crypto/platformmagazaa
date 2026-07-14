import { useEffect, useState } from "react";
import { Text, View, Alert, Pressable } from "react-native";
import { Image } from "expo-image";
import { Screen, Card, styles } from "@/components/ui";
import { api, getUser } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import { ADMIN_MENU } from "@/lib/menus";
import {
  MEDIA_CATEGORIES,
  MEDIA_CATEGORY_LABELS,
  thumbUrl,
  type MediaCategory,
  type PaginatedResponse,
} from "@magaza/shared";
import { colors, spacing } from "@/components/theme";

type MediaItem = {
  id: string;
  url: string;
  category: MediaCategory;
  createdAt: string;
  store?: { name: string } | null;
};

export default function AdminMedia() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [category, setCategory] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);

  async function load() {
    try {
      const params = new URLSearchParams({ limit: "48" });
      if (category) params.set("category", category);
      const data = await api.get<PaginatedResponse<MediaItem>>(`/api/v1/admin/media?${params}`);
      setItems(data.items);
    } catch {
      /* handled globally */
    }
  }

  useEffect(() => {
    getUser().then((u) => setIsAdmin(u?.role === "ADMIN"));
    load();
  }, [category]);

  async function remove(id: string) {
    if (!isAdmin) return;
    Alert.alert("Sil", "Bu görsel silinsin mi?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/api/v1/admin/media/${id}`);
            setItems((prev) => prev.filter((i) => i.id !== id));
          } catch (e) {
            Alert.alert("Hata", e instanceof Error ? e.message : "Silinemedi");
          }
        },
      },
    ]);
  }

  return (
    <Screen title="Görsel Kütüphanesi" subtitle="Kaynak kategorisine göre görseller" menuItems={ADMIN_MENU}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
        <Pressable onPress={() => setCategory("")} style={{ padding: 8, borderRadius: 8, backgroundColor: !category ? colors.primary : colors.bgCard }}>
          <Text style={{ color: colors.text, fontSize: 12 }}>Tümü</Text>
        </Pressable>
        {MEDIA_CATEGORIES.map((c) => (
          <Pressable key={c} onPress={() => setCategory(c)} style={{ padding: 8, borderRadius: 8, backgroundColor: category === c ? colors.primary : colors.bgCard }}>
            <Text style={{ color: colors.text, fontSize: 12 }}>{MEDIA_CATEGORY_LABELS[c]}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {items.map((item) => (
          <Card key={item.id}>
            <Image
              source={{ uri: `${API_URL}${thumbUrl(item.url)!}` }}
              style={{ width: 140, height: 140, borderRadius: 8 }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <Text style={[styles.cardSubtitle, { marginTop: 8 }]}>{MEDIA_CATEGORY_LABELS[item.category]}</Text>
            <Text style={styles.cardBody}>{item.store?.name ?? "-"}</Text>
            {isAdmin && (
              <Text style={{ color: "#ef4444", marginTop: 8 }} onPress={() => remove(item.id)}>
                Sil
              </Text>
            )}
          </Card>
        ))}
      </View>
    </Screen>
  );
}
