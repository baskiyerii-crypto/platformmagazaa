import { useEffect, useMemo, useState } from "react";
import { Text, Alert, StyleSheet, View, ActivityIndicator, Pressable } from "react-native";
import { Screen, Card, InputField, PrimaryButton, StatusPill, styles } from "@/components/ui";
import { CachedImage } from "@/components/cached-image";
import { colors, radius, spacing } from "@/components/theme";
import { api } from "@/lib/auth";
import { STORE_MENU } from "@/lib/menus";
import {
  CATALOG_CAMPAIGN_MODE_LABELS,
  CHANGE_REQUEST_STATUS_LABELS,
  type CatalogCampaignMode,
  type ChangeRequestStatus,
  type PaginatedResponse,
} from "@magaza/shared";

type CatalogItem = {
  id: string;
  name: string;
  description?: string | null;
  referenceImageUrl?: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
};

type Campaign = {
  id: string;
  name: string;
  description?: string | null;
  mode: CatalogCampaignMode;
  openForRequests?: boolean;
  categories: { id: string; name: string }[];
  items: CatalogItem[];
};

type CatalogRequest = {
  id: string;
  quantity?: number | null;
  status: ChangeRequestStatus;
  campaign?: { name: string } | null;
  catalogItem: { id: string; name: string; category?: { name: string } | null };
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [requests, setRequests] = useState<CatalogRequest[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId]
  );

  const grouped = useMemo(() => {
    if (!selected) return [];
    const map = new Map<string, { name: string; items: CatalogItem[] }>();
    for (const item of selected.items) {
      const key = item.categoryId ?? "none";
      const name = item.category?.name ?? "Diğer";
      if (!map.has(key)) map.set(key, { name, items: [] });
      map.get(key)!.items.push(item);
    }
    return [...map.values()];
  }, [selected]);

  async function load() {
    setLoading(true);
    try {
      const [campaignData, reqs] = await Promise.all([
        api.getCached<Campaign[]>("/api/v1/admin/catalog/campaigns", 60_000),
        api.getCached<PaginatedResponse<CatalogRequest>>("/api/v1/catalog-requests?limit=100", 30_000),
      ]);
      const open = campaignData.filter((c) => c.openForRequests !== false);
      setCampaigns(open);
      setRequests(reqs.items);
      const nextId = open.find((c) => c.id === campaignId)?.id ?? open[0]?.id ?? "";
      setCampaignId(nextId);
      const qty: Record<string, string> = {};
      for (const req of reqs.items) {
        if (req.catalogItem?.id && req.quantity != null) {
          qty[req.catalogItem.id] = String(req.quantity);
        }
      }
      setQuantities((prev) => ({ ...qty, ...prev }));
    } catch {
      /* handled globally */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit() {
    if (!selected) return;
    const items = selected.items
      .map((item) => ({
        catalogItemId: item.id,
        quantity: Number(quantities[item.id] || 0),
      }))
      .filter((line) => Number.isFinite(line.quantity) && line.quantity >= 1);

    if (items.length === 0) {
      Alert.alert("Hata", "En az bir ürün için adet girin");
      return;
    }

    setSaving(true);
    try {
      await api.post("/api/v1/catalog-requests", { campaignId: selected.id, items });
      Alert.alert("Başarılı", `${items.length} ürün için adet bildirildi`);
      await load();
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Gönderilemedi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Kampanya Adetleri" subtitle="Ürün adetlerini tek formda bildirin" menuItems={STORE_MENU}>
      {loading && campaigns.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
      ) : null}

      {campaigns.length === 0 ? (
        <Card>
          <Text style={styles.cardSubtitle}>Şu an açık kampanya yok.</Text>
        </Card>
      ) : (
        <>
          <Card>
            <Text style={styles.cardTitle}>Kampanya</Text>
            <View style={{ gap: spacing.sm }}>
              {campaigns.map((c) => (
                <Pressable key={c.id} onPress={() => setCampaignId(c.id)}>
                  <Text
                    style={[
                      localStyles.campaignOption,
                      campaignId === c.id && localStyles.campaignSelected,
                    ]}
                  >
                    {c.name} ({CATALOG_CAMPAIGN_MODE_LABELS[c.mode]})
                  </Text>
                </Pressable>
              ))}
            </View>
            {selected?.description ? (
              <Text style={[styles.cardSubtitle, { marginTop: spacing.sm }]}>{selected.description}</Text>
            ) : null}
          </Card>

          {grouped.map((group) => (
            <Card key={group.name}>
              <Text style={styles.cardTitle}>{group.name}</Text>
              {group.items.map((item) => (
                <View key={item.id} style={localStyles.itemRow}>
                  <CachedImage uri={item.referenceImageUrl} style={localStyles.thumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={localStyles.itemName}>{item.name}</Text>
                    {item.description ? (
                      <Text style={styles.cardSubtitle}>{item.description}</Text>
                    ) : null}
                    <InputField
                      label="Adet"
                      value={quantities[item.id] ?? ""}
                      onChangeText={(v) => setQuantities((prev) => ({ ...prev, [item.id]: v }))}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                </View>
              ))}
            </Card>
          ))}

          <PrimaryButton label={saving ? "Gönderiliyor..." : "Adetleri Gönder"} onPress={submit} />
        </>
      )}

      {requests.map((req) => (
        <Card key={req.id}>
          <Text style={styles.cardTitle}>{req.catalogItem.name}</Text>
          <Text style={styles.cardSubtitle}>
            {req.campaign?.name ?? "Kampanya"}
            {req.catalogItem.category?.name ? ` · ${req.catalogItem.category.name}` : ""}
          </Text>
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
  campaignOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  campaignSelected: {
    borderColor: colors.primary,
    backgroundColor: "#eff6ff",
  },
  itemRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  thumb: { width: 64, height: 64, borderRadius: radius.lg },
  itemName: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 4 },
});
