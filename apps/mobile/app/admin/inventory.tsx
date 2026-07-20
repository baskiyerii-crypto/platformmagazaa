import { useEffect, useState, useCallback, useMemo } from "react";
import { Text, Image, View, StyleSheet, Pressable } from "react-native";
import { ListScreen } from "@/components/list-screen";
import { Card, InputField, styles } from "@/components/ui";
import { colors, radius, spacing } from "@/components/theme";
import { api } from "@/lib/auth";
import { ADMIN_MENU } from "@/lib/menus";
import { API_URL } from "@/lib/config";
import { thumbUrl, type PaginatedResponse } from "@magaza/shared";

type InventoryItem = {
  id: string;
  type: "AVM_VITRIN" | "OUTDOOR" | "STORE_SIGNAGE";
  label: string;
  store: { id: string; name: string };
  en?: number;
  boy?: number;
  adet?: number;
  gorselUrl?: string | null;
};

type Store = { id: string; name: string };

type InventoryStats = {
  storesWithInventory: number;
  totalImages: number;
};

const TYPE_LABELS: Record<string, string> = {
  AVM_VITRIN: "AVM Vitrin",
  OUTDOOR: "Açık Hava",
  STORE_SIGNAGE: "Mağaza İçi",
};

function imageUrl(item: InventoryItem) {
  const thumb = thumbUrl(item.gorselUrl);
  return thumb ? `${API_URL}${thumb}` : null;
}

export default function AdminInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [storeId, setStoreId] = useState("");
  const [storeQuery, setStoreQuery] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const filteredStores = useMemo(() => {
    const q = storeQuery.trim().toLocaleLowerCase("tr");
    if (!q) return stores;
    return stores.filter((s) => s.name.toLocaleLowerCase("tr").includes(q));
  }, [stores, storeQuery]);

  const selectedStoreName = stores.find((s) => s.id === storeId)?.name;

  const load = useCallback(async (p = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "all" });
      if (storeId) params.set("storeId", storeId);
      if (type) params.set("type", type);
      if (search) params.set("search", search);
      const data = await api.getPaginated<InventoryItem>(`/api/v1/admin/inventory?${params}`);
      setItems(data.items);
      setHasMore(false);
      setPage(1);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [storeId, type, search]);

  useEffect(() => {
    api.getCached<Store[]>("/api/v1/admin/stores?slim=1", 120_000).then(setStores).catch(() => {});
    api.get<InventoryStats>("/api/v1/admin/inventory/stats").then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    load(1);
  }, [storeId, type]);

  const renderItem = useCallback(({ item }: { item: InventoryItem }) => (
    <Card>
      <Text style={styles.cardTitle}>{item.label}</Text>
      <Text style={styles.cardSubtitle}>{TYPE_LABELS[item.type] ?? item.type}</Text>
      {item.en && item.boy ? (
        <Text style={styles.cardBody}>
          {item.en}×{item.boy} cm
          {item.adet ? ` · ${item.adet} adet` : ""}
        </Text>
      ) : null}
      {imageUrl(item) ? (
        <Image source={{ uri: imageUrl(item)! }} style={localStyles.photo} resizeMode="cover" />
      ) : null}
    </Card>
  ), []);

  const filters = (
    <Card>
      {stats && (
        <View style={localStyles.statsRow}>
          <View style={localStyles.statCard}>
            <Text style={localStyles.statLabel}>Envanter giren mağaza</Text>
            <Text style={localStyles.statValue}>{stats.storesWithInventory}</Text>
          </View>
          <View style={localStyles.statCard}>
            <Text style={localStyles.statLabel}>Toplam görsel</Text>
            <Text style={localStyles.statValue}>{stats.totalImages}</Text>
          </View>
        </View>
      )}
      <InputField label="Ara" value={search} onChangeText={setSearch} placeholder="Mağaza veya ürün" />
      <Pressable onPress={() => load(1)} style={localStyles.filterBtn}>
        <Text style={localStyles.filterBtnText}>Ara</Text>
      </Pressable>
      <InputField
        label="Mağaza ara"
        value={selectedStoreName && !storeQuery ? selectedStoreName : storeQuery}
        onChangeText={(t) => {
          setStoreQuery(t);
          if (storeId) setStoreId("");
        }}
        placeholder="Mağaza adına göre filtrele"
      />
      {storeId ? (
        <Pressable
          onPress={() => {
            setStoreId("");
            setStoreQuery("");
          }}
          style={[localStyles.chip, localStyles.chipActive, { alignSelf: "flex-start", marginBottom: spacing.md }]}
        >
          <Text style={[localStyles.chipText, localStyles.chipTextActive]}>Seçimi kaldır (Tümü)</Text>
        </Pressable>
      ) : (
        <View style={localStyles.chips}>
          <Pressable onPress={() => setStoreId("")} style={[localStyles.chip, !storeId && localStyles.chipActive]}>
            <Text style={[localStyles.chipText, !storeId && localStyles.chipTextActive]}>Tümü</Text>
          </Pressable>
          {filteredStores.slice(0, 30).map((s) => (
            <Pressable
              key={s.id}
              onPress={() => {
                setStoreId(s.id);
                setStoreQuery("");
              }}
              style={[localStyles.chip, storeId === s.id && localStyles.chipActive]}
            >
              <Text style={[localStyles.chipText, storeId === s.id && localStyles.chipTextActive]}>{s.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Text style={styles.inputLabel}>Tür</Text>
      <View style={localStyles.chips}>
        <Pressable onPress={() => setType("")} style={[localStyles.chip, !type && localStyles.chipActive]}>
          <Text style={[localStyles.chipText, !type && localStyles.chipTextActive]}>Tümü</Text>
        </Pressable>
        {Object.entries(TYPE_LABELS).map(([k, label]) => (
          <Pressable key={k} onPress={() => setType(k)} style={[localStyles.chip, type === k && localStyles.chipActive]}>
            <Text style={[localStyles.chipText, type === k && localStyles.chipTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );

  return (
    <ListScreen
      title="Envanter"
      subtitle="Tüm mağazaların envanter özeti"
      menuItems={ADMIN_MENU}
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => `${item.type}-${item.id}`}
      ListHeaderComponent={filters}
      loading={loading}
      loadingMore={loadingMore}
      onEndReached={undefined}
    />
  );
}

const localStyles = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    backgroundColor: colors.bgCard,
  },
  statLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "700", color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accentSoft, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textMuted },
  chipTextActive: { color: colors.primary, fontWeight: "600" },
  filterBtn: { marginBottom: spacing.md, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: "center" },
  filterBtnText: { color: colors.onPrimary, fontWeight: "600" },
  photo: { marginTop: spacing.sm, height: 100, width: "100%", borderRadius: radius.lg },
});
