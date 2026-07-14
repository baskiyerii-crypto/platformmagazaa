import { useEffect, useState } from "react";
import { Text, Alert, View, Pressable } from "react-native";
import { Screen, Card, InputField, PrimaryButton, SecondaryButton, styles } from "@/components/ui";
import { api, getUser } from "@/lib/auth";
import { ADMIN_MENU } from "@/lib/menus";
import { CATALOG_ITEM_TYPES, CATALOG_ITEM_TYPE_LABELS, type CatalogItemType } from "@magaza/shared";
import { colors, spacing } from "@/components/theme";

type CatalogItem = { id: string; name: string; code: string; type: CatalogItemType };

export default function AdminCatalog() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<CatalogItemType>("FIXED");

  async function load() {
    try {
      setItems(await api.get<CatalogItem[]>("/api/v1/admin/catalog"));
    } catch {
      /* handled globally */
    }
  }

  useEffect(() => {
    getUser().then((u) => setIsAdmin(u?.role === "ADMIN"));
    load();
  }, []);

  async function createItem() {
    if (!isAdmin) return Alert.alert("Yetki yok");
    try {
      await api.post("/api/v1/admin/catalog", { name, code, type });
      setName("");
      setCode("");
      load();
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Eklenemedi");
    }
  }

  async function removeItem(id: string) {
    if (!isAdmin) return;
    Alert.alert("Sil", "Bu ürün silinsin mi?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/api/v1/admin/catalog/${id}`);
            load();
          } catch (e) {
            Alert.alert("Hata", e instanceof Error ? e.message : "Silinemedi");
          }
        },
      },
    ]);
  }

  return (
    <Screen title="Katalog" subtitle={isAdmin ? "Ürün tanımlama" : "Salt okunur"} menuItems={ADMIN_MENU}>
      {isAdmin && (
        <Card>
          <InputField label="Ad" value={name} onChangeText={setName} />
          <InputField label="Kod" value={code} onChangeText={setCode} />
          <Text style={styles.inputLabel}>Tür</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
            {CATALOG_ITEM_TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: type === t ? colors.primary : colors.bgCard,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 12 }}>{CATALOG_ITEM_TYPE_LABELS[t]}</Text>
              </Pressable>
            ))}
          </View>
          <PrimaryButton label="Ekle" onPress={createItem} />
        </Card>
      )}
      {items.map((item) => (
        <Card key={item.id}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSubtitle}>{item.code} · {CATALOG_ITEM_TYPE_LABELS[item.type]}</Text>
          {isAdmin && <SecondaryButton label="Sil" onPress={() => removeItem(item.id)} />}
        </Card>
      ))}
    </Screen>
  );
}
