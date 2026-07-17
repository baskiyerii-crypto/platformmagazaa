import { useEffect, useState } from "react";
import { Text, Alert, View, Pressable } from "react-native";
import { Screen, Card, InputField, PrimaryButton, SecondaryButton, styles } from "@/components/ui";
import { api, getUser } from "@/lib/auth";
import { ADMIN_MENU } from "@/lib/menus";
import {
  CATALOG_CAMPAIGN_MODE_LABELS,
  CATALOG_ITEM_TYPES,
  CATALOG_ITEM_TYPE_LABELS,
  type CatalogCampaignMode,
  type CatalogItemType,
} from "@magaza/shared";
import { colors, spacing } from "@/components/theme";

type Category = { id: string; name: string };
type CatalogItem = {
  id: string;
  name: string;
  code: string;
  type: CatalogItemType;
  category?: { name: string } | null;
};
type Campaign = {
  id: string;
  name: string;
  mode: CatalogCampaignMode;
  categories: Category[];
  items: CatalogItem[];
  openForRequests?: boolean;
};

export default function AdminCatalog() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<CatalogItemType>("FIXED");
  const [categoryId, setCategoryId] = useState("");

  const selected = campaigns.find((c) => c.id === campaignId) ?? null;

  async function load() {
    try {
      const data = await api.get<Campaign[]>("/api/v1/admin/catalog/campaigns?all=1");
      setCampaigns(data);
      const next = data.find((c) => c.id === campaignId) ?? data[0];
      setCampaignId(next?.id ?? "");
      setCategoryId(next?.categories[0]?.id ?? "");
    } catch {
      /* handled globally */
    }
  }

  useEffect(() => {
    getUser().then((u) => setIsAdmin(u?.role === "ADMIN"));
    load();
  }, []);

  async function createCategory() {
    if (!isAdmin || !campaignId) return Alert.alert("Yetki yok");
    try {
      await api.post("/api/v1/admin/catalog/categories", { campaignId, name: categoryName });
      setCategoryName("");
      load();
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Eklenemedi");
    }
  }

  async function createItem() {
    if (!isAdmin || !campaignId || !categoryId) return Alert.alert("Yetki yok");
    try {
      await api.post("/api/v1/admin/catalog?scope=campaign", {
        name,
        code,
        type,
        campaignId,
        categoryId,
      });
      setName("");
      setCode("");
      load();
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Eklenemedi");
    }
  }

  async function removeItem(id: string) {
    if (!isAdmin) return;
    Alert.alert("Sil", "Bu ürün pasif edilsin mi?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Pasif Et",
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
    <Screen title="Kampanya Katalog" subtitle={isAdmin ? "Kampanya / kategori / ürün" : "Salt okunur"} menuItems={ADMIN_MENU}>
      <Card>
        <Text style={styles.cardTitle}>Kampanyalar</Text>
        {campaigns.map((c) => (
          <Pressable key={c.id} onPress={() => {
            setCampaignId(c.id);
            setCategoryId(c.categories[0]?.id ?? "");
          }}>
            <Text style={{
              marginBottom: spacing.sm,
              color: campaignId === c.id ? colors.primary : colors.text,
              fontWeight: campaignId === c.id ? "700" : "400",
            }}>
              {c.name} ({CATALOG_CAMPAIGN_MODE_LABELS[c.mode]})
            </Text>
          </Pressable>
        ))}
      </Card>

      {isAdmin && selected && (
        <>
          <Card>
            <InputField label="Yeni Kategori" value={categoryName} onChangeText={setCategoryName} />
            <PrimaryButton label="Kategori Ekle" onPress={createCategory} />
          </Card>
          <Card>
            <Text style={styles.inputLabel}>Kategori</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
              {selected.categories.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: categoryId === c.id ? colors.primary : colors.bgCard,
                  }}
                >
                  <Text style={{ color: categoryId === c.id ? "#fff" : colors.text }}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
            <InputField label="Ürün Adı" value={name} onChangeText={setName} />
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
                  <Text style={{ color: type === t ? "#fff" : colors.text }}>{CATALOG_ITEM_TYPE_LABELS[t]}</Text>
                </Pressable>
              ))}
            </View>
            <PrimaryButton label="Ürün Ekle" onPress={createItem} />
          </Card>
        </>
      )}

      {selected?.items.map((item) => (
        <Card key={item.id}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSubtitle}>
            {item.code} · {CATALOG_ITEM_TYPE_LABELS[item.type]}
            {item.category?.name ? ` · ${item.category.name}` : ""}
          </Text>
          {isAdmin ? <SecondaryButton label="Pasif Et" onPress={() => removeItem(item.id)} /> : null}
        </Card>
      ))}
    </Screen>
  );
}
