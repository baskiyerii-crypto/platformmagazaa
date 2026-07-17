import { useEffect, useState } from "react";
import { Text, Alert, StyleSheet, Pressable, View, Modal } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Card, InputField, PrimaryButton, SecondaryButton, styles } from "@/components/ui";
import { ListScreen } from "@/components/list-screen";
import { CachedImage } from "@/components/cached-image";
import { colors, radius, spacing } from "@/components/theme";
import { api, getToken } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import { STORE_MENU } from "@/lib/menus";

type SignageEntry = {
  id: string;
  subType: { name: string; id: string };
  placement: { name: string; id: string };
  reyonCategory?: { name: string; id: string } | null;
  en: number;
  boy: number;
  adet: number;
  note?: string | null;
  gorselUrl?: string | null;
};

export default function StoreSignage() {
  const [entries, setEntries] = useState<SignageEntry[]>([]);
  const [subTypes, setSubTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [placements, setPlacements] = useState<Array<{ id: string; name: string }>>([]);
  const [reyonCategories, setReyonCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [subTypeId, setSubTypeId] = useState("");
  const [placementId, setPlacementId] = useState("");
  const [reyonCategoryId, setReyonCategoryId] = useState("");
  const [en, setEn] = useState("");
  const [boy, setBoy] = useState("");
  const [adet, setAdet] = useState("1");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editEntry, setEditEntry] = useState<SignageEntry | null>(null);
  const [editPlacementId, setEditPlacementId] = useState("");
  const [editReyonCategoryId, setEditReyonCategoryId] = useState("");
  const [editEn, setEditEn] = useState("");
  const [editBoy, setEditBoy] = useState("");
  const [editAdet, setEditAdet] = useState("");
  const [editNote, setEditNote] = useState("");

  async function load() {
    setLoading(true);
    const [defs, list] = await Promise.all([
      api.getCached<{
        categories: Array<{ type: string; subTypes: Array<{ id: string; name: string }> }>;
        placements: Array<{ id: string; name: string }>;
        reyonCategories: Array<{ id: string; name: string }>;
      }>("/api/v1/definitions", 300_000),
      api.get<SignageEntry[]>("/api/v1/store/signage-entries"),
    ]);
    const magazaIci = defs.categories.find((c) => c.type === "MAGAZA_ICI");
    setSubTypes(magazaIci?.subTypes ?? []);
    setPlacements(defs.placements ?? []);
    setReyonCategories(defs.reyonCategories ?? []);
    if (magazaIci?.subTypes[0]) setSubTypeId(magazaIci.subTypes[0].id);
    if (defs.placements[0]) setPlacementId(defs.placements[0].id);
    setEntries(list);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveWithPhoto() {
    if (saving) return;
    if (!placementId) {
      Alert.alert("Hata", "Konum seçin");
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("İzin gerekli", "Kamera izni verilmeli");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    if (result.canceled || !result.assets[0]) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("subTypeId", subTypeId);
      formData.append("placementId", placementId);
      if (reyonCategoryId) formData.append("reyonCategoryId", reyonCategoryId);
      formData.append("en", en);
      formData.append("boy", boy);
      formData.append("adet", adet);
      formData.append("note", note);
      formData.append("file", {
        uri: result.assets[0].uri,
        name: "photo.jpg",
        type: "image/jpeg",
      } as unknown as Blob);

      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/store/signage-entries`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Alert.alert("Hata", (err as { error?: string }).error ?? "Kayıt başarısız");
        return;
      }

      setEn("");
      setBoy("");
      setAdet("1");
      setNote("");
      await load();
      Alert.alert("Başarılı", "Mağaza içi kayıt eklendi");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(entry: SignageEntry) {
    setEditEntry(entry);
    setEditPlacementId(entry.placement.id);
    setEditReyonCategoryId(entry.reyonCategory?.id ?? "");
    setEditEn(String(entry.en));
    setEditBoy(String(entry.boy));
    setEditAdet(String(entry.adet));
    setEditNote(entry.note ?? "");
  }

  async function saveEdit() {
    if (!editEntry || saving) return;
    setSaving(true);
    try {
      await api.patch(`/api/v1/store/signage-entries/${editEntry.id}`, {
        placementId: editPlacementId,
        reyonCategoryId: editReyonCategoryId || null,
        en: Number(editEn),
        boy: Number(editBoy),
        adet: Number(editAdet),
        note: editNote || null,
      });
      setEditEntry(null);
      await load();
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Güncellenemedi");
    } finally {
      setSaving(false);
    }
  }

  async function changePhoto() {
    if (!editEntry) return;
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
    await fetch(`${API_URL}/api/v1/store/signage-entries/${editEntry.id}`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    setEditEntry(null);
    load();
  }

  async function deleteEntry(id: string) {
    Alert.alert("Sil", "Kayıt silinsin mi?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          await api.delete(`/api/v1/store/signage-entries/${id}`);
          load();
        },
      },
    ]);
  }

  async function requestChange(id: string) {
    try {
      await api.post("/api/v1/change-requests", {
        targetType: "STORE_SIGNAGE",
        targetId: id,
        note: "Mobil değişim talebi",
      });
      Alert.alert("Değişim talebi oluşturuldu");
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Talep oluşturulamadı");
    }
  }

  return (
    <>
      <ListScreen
        title="Mağaza İçi Reklamlar"
        subtitle="Yöneticinin tanımladığı tür ve konumdan seçin"
        menuItems={STORE_MENU}
        data={entries}
        loading={loading}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <Card>
            <Text style={styles.cardTitle}>Yeni kayıt</Text>
            {(subTypes.length === 0 || placements.length === 0) && (
              <Text style={styles.cardSubtitle}>
                Tür veya konum tanımlı değil. Yönetici Tanımlar ekranından eklemelidir.
              </Text>
            )}
            <Text style={styles.inputLabel}>Envanter Türü</Text>
            <View style={localStyles.typeRow}>
              {subTypes.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setSubTypeId(s.id)}
                  style={[localStyles.typeChip, subTypeId === s.id && localStyles.typeChipActive]}
                >
                  <Text style={[localStyles.typeText, subTypeId === s.id && localStyles.typeTextActive]}>{s.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.inputLabel}>Reyon Kategorisi</Text>
            <View style={localStyles.typeRow}>
              <Pressable
                onPress={() => setReyonCategoryId("")}
                style={[localStyles.typeChip, !reyonCategoryId && localStyles.typeChipActive]}
              >
                <Text style={[localStyles.typeText, !reyonCategoryId && localStyles.typeTextActive]}>
                  Belirtilmedi
                </Text>
              </Pressable>
              {reyonCategories.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => setReyonCategoryId(r.id)}
                  style={[localStyles.typeChip, reyonCategoryId === r.id && localStyles.typeChipActive]}
                >
                  <Text style={[localStyles.typeText, reyonCategoryId === r.id && localStyles.typeTextActive]}>
                    {r.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.inputLabel}>Konum</Text>
            <View style={localStyles.typeRow}>
              {placements.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setPlacementId(p.id)}
                  style={[localStyles.typeChip, placementId === p.id && localStyles.typeChipActive]}
                >
                  <Text style={[localStyles.typeText, placementId === p.id && localStyles.typeTextActive]}>{p.name}</Text>
                </Pressable>
              ))}
            </View>
            <InputField label="En (cm)" value={en} onChangeText={setEn} keyboardType="numeric" />
            <InputField label="Boy (cm)" value={boy} onChangeText={setBoy} keyboardType="numeric" />
            <InputField label="Adet" value={adet} onChangeText={setAdet} keyboardType="numeric" />
            <InputField label="Not" value={note} onChangeText={setNote} />
            <PrimaryButton label="Fotoğraf Çek ve Kaydet" onPress={saveWithPhoto} loading={saving} />
          </Card>
        }
        renderItem={({ item: entry }) => (
          <Card>
            <Text style={styles.cardTitle}>{entry.subType.name}</Text>
            <Text style={styles.cardSubtitle}>{entry.placement.name}</Text>
            <Text style={styles.cardSubtitle}>
              Reyon: {entry.reyonCategory?.name ?? "Belirtilmedi"}
            </Text>
            <Text style={styles.cardBody}>
              {entry.en}×{entry.boy} cm · {entry.adet} adet
            </Text>
            {entry.note ? <Text style={styles.cardSubtitle}>{entry.note}</Text> : null}
            <CachedImage uri={entry.gorselUrl} style={localStyles.photo} />
            <View style={localStyles.actions}>
              <SecondaryButton label="Düzenle" onPress={() => openEdit(entry)} />
              <SecondaryButton label="Değişim Talebi" onPress={() => requestChange(entry.id)} />
              <SecondaryButton label="Sil" onPress={() => deleteEntry(entry.id)} />
            </View>
          </Card>
        )}
      />

      <Modal visible={!!editEntry} animationType="slide" transparent onRequestClose={() => setEditEntry(null)}>
        <View style={localStyles.modalOverlay}>
          <View style={localStyles.modal}>
            <Text style={styles.cardTitle}>Mağaza İçi Düzenle</Text>
            <Text style={styles.inputLabel}>Konum</Text>
            <View style={localStyles.typeRow}>
              {placements.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setEditPlacementId(p.id)}
                  style={[localStyles.typeChip, editPlacementId === p.id && localStyles.typeChipActive]}
                >
                  <Text style={[localStyles.typeText, editPlacementId === p.id && localStyles.typeTextActive]}>{p.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.inputLabel}>Reyon Kategorisi</Text>
            <View style={localStyles.typeRow}>
              <Pressable
                onPress={() => setEditReyonCategoryId("")}
                style={[localStyles.typeChip, !editReyonCategoryId && localStyles.typeChipActive]}
              >
                <Text style={[localStyles.typeText, !editReyonCategoryId && localStyles.typeTextActive]}>
                  Belirtilmedi
                </Text>
              </Pressable>
              {reyonCategories.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => setEditReyonCategoryId(r.id)}
                  style={[localStyles.typeChip, editReyonCategoryId === r.id && localStyles.typeChipActive]}
                >
                  <Text style={[localStyles.typeText, editReyonCategoryId === r.id && localStyles.typeTextActive]}>
                    {r.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <InputField label="En" value={editEn} onChangeText={setEditEn} keyboardType="numeric" />
            <InputField label="Boy" value={editBoy} onChangeText={setEditBoy} keyboardType="numeric" />
            <InputField label="Adet" value={editAdet} onChangeText={setEditAdet} keyboardType="numeric" />
            <InputField label="Not" value={editNote} onChangeText={setEditNote} />
            <PrimaryButton label="Kaydet" onPress={saveEdit} loading={saving} />
            <View style={{ marginTop: spacing.sm }}>
              <SecondaryButton label="Görseli Değiştir" onPress={changePhoto} />
            </View>
            <View style={{ marginTop: spacing.sm }}>
              <SecondaryButton label="İptal" onPress={() => setEditEntry(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const localStyles = StyleSheet.create({
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { fontSize: 13, color: colors.textMuted },
  typeTextActive: { color: colors.white, fontWeight: "600" },
  photo: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    height: 160,
    width: "100%",
    borderRadius: radius.lg,
    backgroundColor: colors.bgInput,
  },
  actions: { gap: spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "flex-end" },
  modal: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
});
