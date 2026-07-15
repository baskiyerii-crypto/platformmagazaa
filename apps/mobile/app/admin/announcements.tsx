import { useEffect, useState } from "react";
import { Text, Linking, View, Alert, ScrollView } from "react-native";
import { Image } from "expo-image";
import { Screen, Card, InputField, PrimaryButton, SecondaryButton, StatusPill, styles } from "@/components/ui";
import { api, getUser } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import { ADMIN_MENU } from "@/lib/menus";
import {
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_RECEIPT_STATUS_LABELS,
  thumbUrl,
  type AnnouncementReceiptStatus,
} from "@magaza/shared";
import { colors } from "@/components/theme";

type Receipt = {
  id: string;
  status: AnnouncementReceiptStatus;
  readAt?: string | null;
  processingAt?: string | null;
  completedAt?: string | null;
  completionImages: string[];
  store?: { id: string; name: string };
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  attachments?: Array<{ label: string; url: string }> | null;
  receipts?: Receipt[];
};

export default function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"ALL_STORES" | "SELECTED_STORES">("ALL_STORES");
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const [list, slim] = await Promise.all([
        api.get<Announcement[]>("/api/v1/admin/announcements"),
        api.getCached<Array<{ id: string; name: string }>>("/api/v1/admin/stores?slim=1", 120_000),
      ]);
      setItems(list);
      setStores(slim);
    } catch {
      /* oturum yenileme / çıkış api client tarafından yönetilir */
    }
  }

  useEffect(() => {
    getUser().then((u) => setIsAdmin(u?.role === "ADMIN"));
    load();
  }, []);

  async function publish() {
    if (!isAdmin) return Alert.alert("Yetki yok");
    if (publishing) return;
    setPublishing(true);
    try {
      await api.post("/api/v1/admin/announcements", { title, body, audience, storeIds, attachments: [] });
      setTitle("");
      setBody("");
      setStoreIds([]);
      await load();
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Yayınlanamadı");
    } finally {
      setPublishing(false);
    }
  }

  async function removeAnnouncement(id: string, label: string) {
    if (busyId) return;
    Alert.alert("Duyuru silinsin mi?", label, [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          setBusyId(id);
          try {
            await api.delete(`/api/v1/admin/announcements/${id}`);
            await load();
          } catch (e) {
            Alert.alert("Hata", e instanceof Error ? e.message : "Silinemedi");
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  function summary(receipts: Receipt[] = []) {
    const counts = { BEKLIYOR: 0, OKUNDU: 0, ISLEME_ALINDI: 0, TAMAMLANDI: 0 };
    receipts.forEach((r) => counts[r.status] += 1);
    return counts;
  }

  return (
    <Screen title="Duyurular" subtitle="Yayınla ve mağaza aşamalarını takip et" menuItems={ADMIN_MENU}>
      {isAdmin && (
        <Card>
          <Text style={styles.cardTitle}>Yeni Duyuru</Text>
          <InputField label="Başlık" value={title} onChangeText={setTitle} />
          <InputField label="İçerik" value={body} onChangeText={setBody} multiline />
          <Text style={styles.inputLabel}>Hedef: {ANNOUNCEMENT_AUDIENCE_LABELS[audience]}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            <PrimaryButton label="Tüm Mağazalar" onPress={() => setAudience("ALL_STORES")} />
            <PrimaryButton label="Seçili" onPress={() => setAudience("SELECTED_STORES")} />
          </View>
          {audience === "SELECTED_STORES" &&
            stores.map((s) => (
              <Text
                key={s.id}
                style={{ color: storeIds.includes(s.id) ? colors.primary : colors.textMuted, marginBottom: 4 }}
                onPress={() =>
                  setStoreIds((prev) =>
                    prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                  )
                }
              >
                {storeIds.includes(s.id) ? "☑" : "☐"} {s.name}
              </Text>
            ))}
          <PrimaryButton label={publishing ? "Yayınlanıyor..." : "Yayınla"} onPress={publish} loading={publishing} />
        </Card>
      )}

      {items.map((a) => {
        const s = summary(a.receipts);
        return (
          <Card key={a.id}>
            <Text style={styles.cardTitle}>{a.title}</Text>
            <Text style={styles.cardBody}>{a.body}</Text>
            {Array.isArray(a.attachments) &&
              a.attachments.map((att, i) => (
                <Text key={i} style={{ color: colors.primary, marginTop: 8 }} onPress={() => Linking.openURL(att.url)}>
                  {att.label}
                </Text>
              ))}
            {isAdmin && (
              <View style={{ marginTop: 10 }}>
                <SecondaryButton
                  label={busyId === a.id ? "Siliniyor..." : "Sil"}
                  onPress={() => removeAnnouncement(a.id, a.title)}
                />
              </View>
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              <StatusPill label={`Bekliyor ${s.BEKLIYOR}`} backgroundColor="#e2e8f0" />
              <StatusPill label={`Okundu ${s.OKUNDU}`} backgroundColor="#bfdbfe" />
              <StatusPill label={`İşleme ${s.ISLEME_ALINDI}`} backgroundColor="#fef08a" />
              <StatusPill label={`Tamam ${s.TAMAMLANDI}`} backgroundColor="#bbf7d0" />
            </View>
            <ScrollView horizontal style={{ marginTop: 12 }}>
              {(a.receipts ?? []).map((r) => (
                <View key={r.id} style={{ width: 220, marginRight: 12, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}>
                  <Text style={styles.cardTitle}>{r.store?.name}</Text>
                  <Text style={styles.cardSubtitle}>{ANNOUNCEMENT_RECEIPT_STATUS_LABELS[r.status]}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                    {r.completionImages.map((url) => (
                      <Image key={url} source={{ uri: `${API_URL}${thumbUrl(url)!}` }} style={{ width: 48, height: 48, borderRadius: 6 }} contentFit="cover" />
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </Card>
        );
      })}
    </Screen>
  );
}
