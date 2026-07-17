import { useEffect, useState, useCallback } from "react";
import {
  Text,
  View,
  Alert,
  StyleSheet,
  Pressable,
  Modal,
  Image,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { ListScreen } from "@/components/list-screen";
import { Card, PrimaryButton, StatusPill, styles } from "@/components/ui";
import { colors, radius, spacing } from "@/components/theme";
import { api } from "@/lib/auth";
import { ADMIN_MENU } from "@/lib/menus";
import {
  ADMIN_STATUS_TRANSITIONS,
  CHANGE_REQUEST_STATUS_LABELS,
  canApproveStoreUpdate,
  changeTargetTypeLabel,
  thumbUrl,
  type ChangeRequestStatus,
  type PaginatedResponse,
} from "@magaza/shared";

const STATUS_COLORS: Record<string, string> = {
  TALEP_OLUSTURULDU: "#F0EFEB",
  ONAYLANDI: "#E0F2FE",
  ISLEME_ALINDI: "#CFFAFE",
  HAZIRLIKTA: "#FEF3C7",
  BASKIDA: "#EDE9FE",
  TAMAMLANDI: "#D1FAE5",
  GUNCELLEME_YUKLENDI: "#FEF3C7",
  MAGAZADA_GUNCELLENDI: "#CCFBF1",
  REDDEDILDI: "#FEE2E2",
};

type Store = { id: string; name: string };

type ChangeRequestTarget = {
  summary: string;
  dimensions?: string | null;
  adet?: number | null;
  konum?: string | null;
  gorselUrl?: string | null;
};

type RequestImage = {
  url: string;
  isArchived: boolean;
};

type ChangeReq = {
  id: string;
  store: { name: string };
  status: ChangeRequestStatus;
  targetType: string;
  note?: string | null;
  target?: ChangeRequestTarget | null;
  images?: RequestImage[];
};

type CatalogReq = {
  id: string;
  store: { name: string };
  status: ChangeRequestStatus;
  catalogItem: { name: string };
  quantity?: number | null;
};

function RequestThumbnails({
  images,
  target,
  onPreview,
}: {
  images?: RequestImage[];
  target?: ChangeRequestTarget | null;
  onPreview: (url: string) => void;
}) {
  const archived = images?.find((img) => img.isArchived);
  const uploaded = images?.find((img) => !img.isArchived);
  const oldUrl = archived?.url ?? null;
  const newUrl = uploaded?.url ?? target?.gorselUrl ?? null;

  if (!oldUrl && !newUrl) return null;

  return (
    <View style={localStyles.thumbRow}>
      {oldUrl && (
        <Pressable onPress={() => onPreview(oldUrl)} style={localStyles.thumbWrap}>
          <Image source={{ uri: thumbUrl(oldUrl) ?? oldUrl }} style={localStyles.thumb} />
          <Text style={localStyles.thumbLabel}>Eski</Text>
        </Pressable>
      )}
      {newUrl && (
        <Pressable onPress={() => onPreview(newUrl)} style={localStyles.thumbWrap}>
          <Image source={{ uri: thumbUrl(newUrl) ?? newUrl }} style={localStyles.thumb} />
          <Text style={localStyles.thumbLabel}>Güncel</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function AdminRequests() {
  const [tab, setTab] = useState<"visual" | "catalog">("visual");
  const [changeRequests, setChangeRequests] = useState<ChangeReq[]>([]);
  const [catalogRequests, setCatalogRequests] = useState<CatalogReq[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { width, height } = useWindowDimensions();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "30", detail: "true" });
      if (storeId) params.set("storeId", storeId);
      if (status) params.set("status", status);
      if (tab === "visual") {
        const data = await api.get<PaginatedResponse<ChangeReq>>(`/api/v1/change-requests?${params}`);
        setChangeRequests(data.items);
      } else {
        const data = await api.get<PaginatedResponse<CatalogReq>>(`/api/v1/catalog-requests?${params}`);
        setCatalogRequests(data.items);
      }
    } finally {
      setLoading(false);
    }
  }, [storeId, status, tab]);

  useEffect(() => {
    api.getCached<Store[]>("/api/v1/admin/stores?slim=1", 120_000).then(setStores).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateChangeStatus(id: string, newStatus: ChangeRequestStatus) {
    try {
      await api.patch(`/api/v1/change-requests/${id}`, { status: newStatus });
      load();
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Güncellenemedi");
    }
  }

  async function updateCatalogStatus(id: string, newStatus: ChangeRequestStatus) {
    try {
      await api.patch(`/api/v1/catalog-requests/${id}`, { status: newStatus });
      load();
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Güncellenemedi");
    }
  }

  const filters = (
    <Card>
      <View style={localStyles.tabs}>
        <Pressable onPress={() => setTab("visual")} style={[localStyles.tab, tab === "visual" && localStyles.tabActive]}>
          <Text style={[localStyles.tabText, tab === "visual" && localStyles.tabTextActive]}>Görsel Değişim</Text>
        </Pressable>
        <Pressable onPress={() => setTab("catalog")} style={[localStyles.tab, tab === "catalog" && localStyles.tabActive]}>
          <Text style={[localStyles.tabText, tab === "catalog" && localStyles.tabTextActive]}>Ürün Talepleri</Text>
        </Pressable>
      </View>
      <Text style={styles.inputLabel}>Mağaza</Text>
      <View style={localStyles.chips}>
        <Pressable onPress={() => setStoreId("")} style={[localStyles.chip, !storeId && localStyles.chipActive]}>
          <Text style={[localStyles.chipText, !storeId && localStyles.chipTextActive]}>Tümü</Text>
        </Pressable>
        {stores.map((s) => (
          <Pressable key={s.id} onPress={() => setStoreId(s.id)} style={[localStyles.chip, storeId === s.id && localStyles.chipActive]}>
            <Text style={[localStyles.chipText, storeId === s.id && localStyles.chipTextActive]}>{s.name}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.inputLabel}>Durum</Text>
      <View style={localStyles.chips}>
        <Pressable onPress={() => setStatus("")} style={[localStyles.chip, !status && localStyles.chipActive]}>
          <Text style={[localStyles.chipText, !status && localStyles.chipTextActive]}>Tümü</Text>
        </Pressable>
        {(Object.keys(CHANGE_REQUEST_STATUS_LABELS) as ChangeRequestStatus[]).map((s) => (
          <Pressable key={s} onPress={() => setStatus(s)} style={[localStyles.chip, status === s && localStyles.chipActive]}>
            <Text style={[localStyles.chipText, status === s && localStyles.chipTextActive]}>{CHANGE_REQUEST_STATUS_LABELS[s]}</Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );

  const renderChangeItem = useCallback(
    ({ item: req }: { item: ChangeReq }) => (
      <Card>
        <Text style={styles.cardTitle}>{req.store.name}</Text>
        {req.target ? (
          <>
            <Text style={styles.cardSubtitle}>{req.target.summary}</Text>
            {req.target.dimensions ? (
              <Text style={styles.cardBody}>Ölçü: {req.target.dimensions}</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.cardSubtitle}>{changeTargetTypeLabel(req.targetType)}</Text>
        )}
        {req.note ? <Text style={styles.cardBody}>{req.note}</Text> : null}
        <RequestThumbnails images={req.images} target={req.target} onPreview={setPreviewUrl} />
        <View style={{ marginTop: 12 }}>
          <StatusPill
            label={CHANGE_REQUEST_STATUS_LABELS[req.status]}
            backgroundColor={STATUS_COLORS[req.status] ?? "#F0EFEB"}
          />
        </View>
        <View style={styles.cardActions}>
          {canApproveStoreUpdate(req.status) && (
            <PrimaryButton
              label="Doğru Güncellendi, Kapat"
              onPress={() => updateChangeStatus(req.id, "MAGAZADA_GUNCELLENDI")}
            />
          )}
          {(ADMIN_STATUS_TRANSITIONS[req.status] ?? []).map((s) => (
            <PrimaryButton key={s} label={CHANGE_REQUEST_STATUS_LABELS[s]} onPress={() => updateChangeStatus(req.id, s)} />
          ))}
        </View>
      </Card>
    ),
    [load]
  );

  const renderCatalogItem = useCallback(
    ({ item: req }: { item: CatalogReq }) => (
      <Card>
        <Text style={styles.cardTitle}>{req.store.name}</Text>
        <Text style={styles.cardSubtitle}>{req.catalogItem.name}</Text>
        {req.quantity ? <Text style={styles.cardBody}>Adet: {req.quantity}</Text> : null}
        <View style={{ marginTop: 12 }}>
          <StatusPill label={CHANGE_REQUEST_STATUS_LABELS[req.status]} backgroundColor={STATUS_COLORS[req.status] ?? "#F0EFEB"} />
        </View>
        <View style={styles.cardActions}>
          {(ADMIN_STATUS_TRANSITIONS[req.status] ?? []).map((s) => (
            <PrimaryButton key={s} label={CHANGE_REQUEST_STATUS_LABELS[s]} onPress={() => updateCatalogStatus(req.id, s)} />
          ))}
        </View>
      </Card>
    ),
    [load]
  );

  const previewModal = (
    <Modal visible={!!previewUrl} transparent animationType="fade" onRequestClose={() => setPreviewUrl(null)}>
      <Pressable style={localStyles.modalBackdrop} onPress={() => setPreviewUrl(null)}>
        <ScrollView
          contentContainerStyle={localStyles.modalScroll}
          maximumZoomScale={3}
          minimumZoomScale={1}
          centerContent
        >
          {previewUrl && (
            <Image
              source={{ uri: previewUrl }}
              style={{ width: width * 0.92, height: height * 0.7 }}
              resizeMode="contain"
            />
          )}
        </ScrollView>
      </Pressable>
    </Modal>
  );

  if (tab === "catalog") {
    return (
      <>
        <ListScreen
          title="Talepler"
          subtitle="Ürün talepleri"
          menuItems={ADMIN_MENU}
          data={catalogRequests}
          renderItem={renderCatalogItem}
          keyExtractor={(req) => req.id}
          ListHeaderComponent={filters}
          loading={loading}
        />
        {previewModal}
      </>
    );
  }

  return (
    <>
      <ListScreen
        title="Talepler"
        subtitle="Görsel değişim talepleri"
        menuItems={ADMIN_MENU}
        data={changeRequests}
        renderItem={renderChangeItem}
        keyExtractor={(req) => req.id}
        ListHeaderComponent={filters}
        loading={loading}
      />
      {previewModal}
    </>
  );
}

const localStyles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  tabTextActive: { color: colors.onPrimary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accentSoft, borderColor: colors.primary },
  chipText: { fontSize: 11, color: colors.textMuted },
  chipTextActive: { color: colors.primary, fontWeight: "600" },
  thumbRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  thumbWrap: { alignItems: "center" },
  thumb: { width: 72, height: 72, borderRadius: radius.lg, backgroundColor: colors.border },
  thumbLabel: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
});
