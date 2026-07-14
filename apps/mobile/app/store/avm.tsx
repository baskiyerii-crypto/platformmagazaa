import { useEffect, useState, useCallback } from "react";
import { Text, View, Alert, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/app-header";
import { NotificationBell } from "@/components/notification-bell";
import { Card, InputField, PrimaryButton, SecondaryButton, styles } from "@/components/ui";
import { CachedImage } from "@/components/cached-image";
import { DeveloperFooter } from "@/components/developer-footer";
import { colors, radius, spacing } from "@/components/theme";
import { api, getToken } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import { STORE_MENU } from "@/lib/menus";
import { AVM_VITRIN_KIND_LABELS } from "@magaza/shared";
import type { AvmVitrinKind } from "@magaza/shared";

type VitrinItem = {
  id: string;
  kind: AvmVitrinKind;
  siraNo: number;
  en: number;
  boy: number;
  camEn?: number | null;
  camBoy?: number | null;
  konum?: string | null;
  gorselUrl?: string | null;
};

type AvmEntry = {
  id: string;
  subType: { name: string; code: string };
  vitrins: VitrinItem[];
};

type Row = { key: string; entryName: string; vitrin: VitrinItem };

type AreaTab = "UCRETSIZ" | "UCRETLI";
type SectionTab = "VITRIN" | "EKSTRA_ALAN";

export default function StoreAvm() {
  const [entries, setEntries] = useState<AvmEntry[]>([]);
  const [areaTab, setAreaTab] = useState<AreaTab>("UCRETSIZ");
  const [sectionTab, setSectionTab] = useState<SectionTab>("VITRIN");
  const [subTypeId, setSubTypeId] = useState("");
  const [en, setEn] = useState("");
  const [boy, setBoy] = useState("");
  const [camEn, setCamEn] = useState("");
  const [camBoy, setCamBoy] = useState("");
  const [konum, setKonum] = useState("");
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<VitrinItem | null>(null);
  const [editEn, setEditEn] = useState("");
  const [editBoy, setEditBoy] = useState("");
  const [editCamEn, setEditCamEn] = useState("");
  const [editCamBoy, setEditCamBoy] = useState("");
  const [editKonum, setEditKonum] = useState("");

  async function load() {
    setLoading(true);
    const [d, e] = await Promise.all([
      api.getCached<{ categories: Array<{ subTypes: Array<{ id: string; name: string; code: string }> }> }>(
        "/api/v1/definitions",
        300_000
      ),
      api.get<AvmEntry[]>("/api/v1/store/avm-entries"),
    ]);
    const match = d.categories.flatMap((c) => c.subTypes).find((s) => s.code === areaTab);
    if (match) setSubTypeId(match.id);
    setEntries(e);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    api.getCached<{ categories: Array<{ subTypes: Array<{ id: string; name: string; code: string }> }> }>(
      "/api/v1/definitions",
      300_000
    ).then((d) => {
      const match = d.categories.flatMap((c) => c.subTypes).find((s) => s.code === areaTab);
      if (match) setSubTypeId(match.id);
    });
  }, [areaTab]);

  const kind: AvmVitrinKind = sectionTab === "EKSTRA_ALAN" ? "EKSTRA_ALAN" : "VITRIN";

  async function saveWithPhoto() {
    if (!en || !boy) {
      Alert.alert("Eksik bilgi", "En ve boy zorunludur");
      return;
    }
    if (kind === "EKSTRA_ALAN" && !konum.trim()) {
      Alert.alert("Eksik bilgi", "Ekstra alan için konum zorunludur");
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("İzin gerekli", "Kamera izni verilmeli");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    if (result.canceled || !result.assets[0]) return;

    const formData = new FormData();
    formData.append("subTypeId", subTypeId);
    formData.append(
      "vitrins",
      JSON.stringify([
        {
          kind,
          siraNo: 1,
          en: Number(en),
          boy: Number(boy),
          camEn: kind === "VITRIN" && camEn ? Number(camEn) : null,
          camBoy: kind === "VITRIN" && camBoy ? Number(camBoy) : null,
          konum: kind === "EKSTRA_ALAN" ? konum.trim() : null,
        },
      ])
    );
    formData.append("videos", "[]");
    formData.append("vitrinFile_0", {
      uri: result.assets[0].uri,
      name: "photo.jpg",
      type: "image/jpeg",
    } as unknown as Blob);

    const token = await getToken();
    const res = await fetch(`${API_URL}/api/v1/store/avm-entries`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      Alert.alert("Hata", err.error ?? "Kayıt başarısız");
      return;
    }

    setEn("");
    setBoy("");
    setCamEn("");
    setCamBoy("");
    setKonum("");
    load();
    Alert.alert("Başarılı", "Kayıt eklendi");
  }

  function openEdit(v: VitrinItem) {
    setEditItem(v);
    setEditEn(String(v.en));
    setEditBoy(String(v.boy));
    setEditCamEn(v.camEn ? String(v.camEn) : "");
    setEditCamBoy(v.camBoy ? String(v.camBoy) : "");
    setEditKonum(v.konum ?? "");
  }

  async function saveEdit() {
    if (!editItem) return;
    try {
      await api.patch(`/api/v1/store/avm-vitrins/${editItem.id}`, {
        vitrinId: editItem.id,
        en: Number(editEn),
        boy: Number(editBoy),
        camEn: editItem.kind === "VITRIN" && editCamEn ? Number(editCamEn) : null,
        camBoy: editItem.kind === "VITRIN" && editCamBoy ? Number(editCamBoy) : null,
        konum: editItem.kind === "EKSTRA_ALAN" ? editKonum.trim() : null,
      });
      setEditItem(null);
      load();
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Güncellenemedi");
    }
  }

  async function changePhoto() {
    if (!editItem) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    if (result.canceled || !result.assets[0]) return;

    const formData = new FormData();
    formData.append("file", {
      uri: result.assets[0].uri,
      name: "photo.jpg",
      type: "image/jpeg",
    } as unknown as Blob);

    const token = await getToken();
    await fetch(`${API_URL}/api/v1/store/avm-vitrins/${editItem.id}`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    setEditItem(null);
    load();
  }

  async function requestChange(targetId: string) {
    await api.post("/api/v1/change-requests", {
      targetType: "AVM_VITRIN",
      targetId,
      note: "Mobil değişim talebi",
    });
    Alert.alert("Talep oluşturuldu");
  }

  async function deleteItem(id: string) {
    Alert.alert("Sil", "Kayıt silinsin mi?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          await api.delete(`/api/v1/store/avm-vitrins/${id}`);
          load();
        },
      },
    ]);
  }

  const filtered = entries.filter((e) => e.subType.code === areaTab);
  const rows: Row[] = filtered.flatMap((entry) =>
    entry.vitrins
      .filter((v) => (sectionTab === "EKSTRA_ALAN" ? v.kind === "EKSTRA_ALAN" : v.kind !== "EKSTRA_ALAN"))
      .map((v) => ({ key: v.id, entryName: entry.subType.name, vitrin: v }))
  );

  return (
    <SafeAreaView style={localStyles.safe}>
      <ScrollView contentContainerStyle={localStyles.pad} keyboardShouldPersistTaps="handled">
        <AppHeader title="AVM" subtitle="Vitrin ve ekstra alanlar" menuItems={STORE_MENU} right={<NotificationBell />} />

        <View style={localStyles.tabs}>
          {(["UCRETSIZ", "UCRETLI"] as const).map((t) => (
            <Pressable key={t} onPress={() => setAreaTab(t)} style={[localStyles.tab, areaTab === t && localStyles.tabActive]}>
              <Text style={[localStyles.tabText, areaTab === t && localStyles.tabTextActive]}>
                {t === "UCRETSIZ" ? "Ücretsiz" : "Ücretli"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={localStyles.tabs}>
          {(["VITRIN", "EKSTRA_ALAN"] as const).map((t) => (
            <Pressable key={t} onPress={() => setSectionTab(t)} style={[localStyles.tab, sectionTab === t && localStyles.tabActive]}>
              <Text style={[localStyles.tabText, sectionTab === t && localStyles.tabTextActive]}>
                {AVM_VITRIN_KIND_LABELS[t]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Card>
          <Text style={styles.cardTitle}>Yeni {AVM_VITRIN_KIND_LABELS[kind]}</Text>
          {kind === "EKSTRA_ALAN" && (
            <InputField label="Konum" value={konum} onChangeText={setKonum} placeholder="Örn: Giriş sol duvar" />
          )}
          <InputField label="En (cm)" value={en} onChangeText={setEn} keyboardType="numeric" />
          <InputField label="Boy (cm)" value={boy} onChangeText={setBoy} keyboardType="numeric" />
          {kind === "VITRIN" && (
            <>
              <InputField label="Cam En (cm)" value={camEn} onChangeText={setCamEn} keyboardType="numeric" placeholder="Opsiyonel" />
              <InputField label="Cam Boy (cm)" value={camBoy} onChangeText={setCamBoy} keyboardType="numeric" placeholder="Opsiyonel" />
            </>
          )}
          <PrimaryButton label="Fotoğraf Çek ve Kaydet" onPress={saveWithPhoto} />
        </Card>

        {loading ? (
          <Text style={localStyles.empty}>Yükleniyor...</Text>
        ) : rows.length === 0 ? (
          <Text style={localStyles.empty}>Kayıt yok</Text>
        ) : (
          rows.map((item) => (
            <Card key={item.key}>
              <Text style={styles.cardTitle}>
                {item.entryName} · {AVM_VITRIN_KIND_LABELS[item.vitrin.kind ?? "VITRIN"]} {item.vitrin.siraNo}
              </Text>
              <Text style={styles.cardBody}>
                {item.vitrin.kind === "EKSTRA_ALAN" && item.vitrin.konum ? `Konum: ${item.vitrin.konum} · ` : ""}
                {item.vitrin.en}×{item.vitrin.boy} cm
                {item.vitrin.camEn && item.vitrin.camBoy ? ` · Cam: ${item.vitrin.camEn}×${item.vitrin.camBoy}` : ""}
              </Text>
              <CachedImage uri={item.vitrin.gorselUrl} style={localStyles.photo} />
              <View style={localStyles.actions}>
                <SecondaryButton label="Düzenle" onPress={() => openEdit(item.vitrin)} />
                <SecondaryButton label="Değişim Talebi" onPress={() => requestChange(item.vitrin.id)} />
                <SecondaryButton label="Sil" onPress={() => deleteItem(item.vitrin.id)} />
              </View>
            </Card>
          ))
        )}
        <DeveloperFooter />
      </ScrollView>

      <Modal visible={!!editItem} animationType="slide" transparent onRequestClose={() => setEditItem(null)}>
        <View style={localStyles.modalOverlay}>
          <View style={localStyles.modal}>
            <Text style={styles.cardTitle}>Düzenle</Text>
            {editItem?.kind === "EKSTRA_ALAN" && (
              <InputField label="Konum" value={editKonum} onChangeText={setEditKonum} />
            )}
            <InputField label="En" value={editEn} onChangeText={setEditEn} keyboardType="numeric" />
            <InputField label="Boy" value={editBoy} onChangeText={setEditBoy} keyboardType="numeric" />
            {editItem?.kind !== "EKSTRA_ALAN" && (
              <>
                <InputField label="Cam En" value={editCamEn} onChangeText={setEditCamEn} keyboardType="numeric" />
                <InputField label="Cam Boy" value={editCamBoy} onChangeText={setEditCamBoy} keyboardType="numeric" />
              </>
            )}
            <PrimaryButton label="Kaydet" onPress={saveEdit} />
            <View style={{ marginTop: spacing.sm }}>
              <SecondaryButton label="Görseli Değiştir" onPress={changePhoto} />
            </View>
            <View style={{ marginTop: spacing.sm }}>
              <SecondaryButton label="İptal" onPress={() => setEditItem(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.md, paddingBottom: spacing.xl },
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
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  tabTextActive: { color: colors.onPrimary },
  photo: { height: 120, width: "100%", borderRadius: radius.lg, marginVertical: spacing.sm },
  actions: { gap: spacing.sm },
  empty: { textAlign: "center", color: colors.textMuted, paddingVertical: 24 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "flex-end" },
  modal: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: "85%",
  },
});
