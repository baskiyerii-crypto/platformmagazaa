import { useEffect, useState } from "react";
import { Text, Alert, StyleSheet, Pressable, View, FlatList, ActivityIndicator } from "react-native";
import { Screen, Card, InputField, PrimaryButton, StatusPill, styles } from "@/components/ui";
import { CachedImage } from "@/components/cached-image";
import { colors, radius, spacing } from "@/components/theme";
import { api, getToken } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import { STORE_MENU } from "@/lib/menus";
import {
  CATALOG_ITEM_TYPE_LABELS,
  CHANGE_REQUEST_STATUS_LABELS,
  type CatalogItemType,
  type ChangeRequestStatus,
  type PaginatedResponse,
} from "@magaza/shared";

type CatalogItem = {
  id: string;
  name: string;
  type: CatalogItemType;
  referenceImageUrl?: string | null;
  description?: string | null;
};

type CatalogRequest = {
  id: string;
  quantity?: number | null;
  status: ChangeRequestStatus;
  catalogItem: CatalogItem;
};

const STATUS_COLORS: Record<string, string> = {
  TALEP_OLUSTURULDU: "#e2e8f0",
  ONAYLANDI: "#bfdbfe",
  ISLEME_ALINDI: "#cffafe",
  HAZIRLIKTA: "#fef08a",
  BASKIDA: "#c7d2fe",
  TAMAMLANDI: "#bbf7d0",
  MAGAZADA_GUNCELLENDI: "#a7f3d0",
  REDDEDILDI: "#fecaca",
};

export default function StoreCatalog() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [requests, setRequests] = useState<CatalogRequest[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(true);

  const selected = items.find((i) => i.id === selectedId);

  async function load() {
    setLoading(true);
    try {
      const [catalog, reqs] = await Promise.all([
        api.getCached<CatalogItem[]>("/api/v1/admin/catalog", 120_000),
        api.getCached<PaginatedResponse<CatalogRequest>>("/api/v1/catalog-requests", 60_000),
      ]);
      setItems(catalog);
      setRequests(reqs.items);
      if (catalog[0] && !selectedId) setSelectedId(catalog[0].id);
    } catch {
      /* handled globally */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submitRequest() {
    if (!selectedId) return;

    const formData = new FormData();
    formData.append("catalogItemId", selectedId);
    formData.append("quantity", quantity);

    const token = await getToken();
    const res = await fetch(`${API_URL}/api/v1/catalog-requests`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      Alert.alert("Hata", err.error ?? "Talep oluşturulamadı");
      return;
    }

    setQuantity("1");
    load();
    Alert.alert("Başarılı", "Ürün talebi oluşturuldu");
  }

  return (
    <Screen title="Ürün Talepleri" subtitle="Katalog ürünleri için talep açın" menuItems={STORE_MENU}>
      {loading && items.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
      ) : null}
      <FlatList
        data={items}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={localStyles.gridRow}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        scrollEnabled={false}
        ListHeaderComponent={null}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelectedId(item.id)}
            style={[localStyles.itemCard, selectedId === item.id && localStyles.itemSelected]}
          >
            <CachedImage uri={item.referenceImageUrl} style={localStyles.thumb} />
            <Text style={localStyles.itemName}>{item.name}</Text>
            <Text style={localStyles.itemType}>{CATALOG_ITEM_TYPE_LABELS[item.type]}</Text>
          </Pressable>
        )}
      />

      {selected && (
        <Card>
          <Text style={styles.cardTitle}>{selected.name} — Talep Aç</Text>
          <InputField label="Adet" value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="1" />
          <PrimaryButton label="Talep Oluştur" onPress={submitRequest} />
        </Card>
      )}

      {requests.map((req) => (
        <Card key={req.id}>
          <Text style={styles.cardTitle}>{req.catalogItem.name}</Text>
          {req.quantity ? <Text style={styles.cardBody}>{req.quantity} adet</Text> : null}
          <View style={{ marginTop: 8 }}>
            <StatusPill
              label={CHANGE_REQUEST_STATUS_LABELS[req.status]}
              backgroundColor={STATUS_COLORS[req.status] ?? "#e2e8f0"}
            />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const localStyles = StyleSheet.create({
  gridRow: { gap: spacing.sm, marginBottom: spacing.sm },
  itemCard: {
    flex: 1,
    maxWidth: "48%",
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  itemSelected: { borderColor: colors.primary, borderWidth: 2 },
  thumb: { height: 80, width: "100%", borderRadius: radius.lg, marginBottom: spacing.sm },
  itemName: { fontSize: 14, fontWeight: "600", color: colors.text },
  itemType: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
