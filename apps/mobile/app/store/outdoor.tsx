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

type OutdoorEntry = {
  id: string;
  subType: { name: string; id: string };
  en: number;
  boy: number;
  adet: number;
  note?: string | null;
  gorselUrl?: string | null;
};

export default function StoreOutdoor() {
  const [entries, setEntries] = useState<OutdoorEntry[]>([]);
  const [subTypes, setSubTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [subTypeId, setSubTypeId] = useState("");
  const [en, setEn] = useState("");
  const [boy, setBoy] = useState("");
  const [adet, setAdet] = useState("1");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editEntry, setEditEntry] = useState<OutdoorEntry | null>(null);
  const [editEn, setEditEn] = useState("");
  const [editBoy, setEditBoy] = useState("");
  const [editAdet, setEditAdet] = useState("");
  const [editNote, setEditNote] = useState("");

  async function load() {
    setLoading(true);
    const [defs, list] = await Promise.all([
      api.getCached<{ categories: Array<{ type: string; subTypes: Array<{ id: string; name: string }> }> }>(
        "/api/v1/definitions",
        300_000
      ),
      api.get<OutdoorEntry[]>("/api/v1/store/outdoor-entries"),
    ]);
    const acik = defs.categories.find((c) => c.type === "ACIK_HAVA");
    setSubTypes(acik?.subTypes ?? []);
    if (acik?.subTypes[0]) setSubTypeId(acik.subTypes[0].id);
    setEntries(list);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveWithPhoto() {
    if (saving) return;
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
      const res = await fetch(`${API_URL}/api/v1/store/outdoor-entries`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        Alert.alert("Hata", "Kayıt başarısız");
        return;
      }

      setEn("");
      setBoy("");
      setAdet("1");
      setNote("");
      await load();
      Alert.alert("Başarılı", "Açık hava kaydı eklendi");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(entry: OutdoorEntry) {
    setEditEntry(entry);
    setEditEn(String(entry.en));
    setEditBoy(String(entry.boy));
    setEditAdet(String(entry.adet));
    setEditNote(entry.note ?? "");
  }

  async function saveEdit() {
    if (!editEntry || saving) return;
    setSaving(true);
    try {
      await api.patch(`/api/v1/store/outdoor-entries/${editEntry.id}`, {
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
    await fetch(`${API_URL}/api/v1/store/outdoor-entries/${editEntry.id}`, {
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
          await api.delete(`/api/v1/store/outdoor-entries/${id}`);
          load();
        },
      },
    ]);
  }

  async function requestChange(id: string) {
    await api.post("/api/v1/change-requests", {
      targetType: "OUTDOOR",
      targetId: id,
      note: "Mobil değişim talebi",
    });
    Alert.alert("Değişim talebi oluşturuldu");
  }

  return (
    <>
      <ListScreen
        title="Açık Hava"
        subtitle="Bağımsız açık hava envanteri"
        menuItems={STORE_MENU}
        data={entries}
        loading={loading}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <Card>
            <Text style={styles.cardTitle}>Yeni kayıt</Text>
            <Text style={styles.inputLabel}>Tür</Text>
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
            <Text style={styles.cardTitle}>Açık Hava Düzenle</Text>
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
