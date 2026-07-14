import { useEffect, useState } from "react";
import { Text, Linking, View, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Screen, Card, PrimaryButton, SecondaryButton, StatusPill, styles } from "@/components/ui";
import { api, getToken } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import { STORE_MENU } from "@/lib/menus";
import {
  ANNOUNCEMENT_RECEIPT_STATUS_LABELS,
  thumbUrl,
  type AnnouncementReceiptStatus,
  type PaginatedResponse,
} from "@magaza/shared";
import { colors } from "@/components/theme";

type Receipt = {
  id: string;
  status: AnnouncementReceiptStatus;
  completionImages: string[];
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  attachments?: Array<{ label: string; url: string }> | null;
  receipt?: Receipt | null;
};

const STATUS_COLORS: Record<AnnouncementReceiptStatus, string> = {
  BEKLIYOR: "#e2e8f0",
  OKUNDU: "#bfdbfe",
  ISLEME_ALINDI: "#fef08a",
  TAMAMLANDI: "#bbf7d0",
};

export default function StoreAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function load() {
    try {
      const d = await api.getCached<PaginatedResponse<Announcement>>("/api/v1/announcements", 30_000);
      setItems(d.items);
    } catch {
      /* handled globally */
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: "OKUNDU" | "ISLEME_ALINDI" | "TAMAMLANDI", files?: ImagePicker.ImagePickerAsset[]) {
    setLoadingId(id);
    try {
      let res: Response;
      if (action === "TAMAMLANDI") {
        if (!files?.length) {
          Alert.alert("Görsel gerekli", "Tamamlama için en az bir fotoğraf seçin");
          return;
        }
        const form = new FormData();
        form.append("action", action);
        files.forEach((file, i) => {
          form.append(`file_${i}`, {
            uri: file.uri,
            name: `completion_${i}.jpg`,
            type: "image/jpeg",
          } as unknown as Blob);
        });
        const token = await getToken();
        res = await fetch(`${API_URL}/api/v1/announcements/${id}/receipt`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
      } else {
        res = await fetch(`${API_URL}/api/v1/announcements/${id}/receipt`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
          body: JSON.stringify({ action }),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Alert.alert("Hata", err.error ?? "İşlem başarısız");
        return;
      }
      await load();
    } finally {
      setLoadingId(null);
    }
  }

  async function completeWithPhotos(id: string) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("İzin gerekli", "Galeri izni verilmeli");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (result.canceled || !result.assets.length) return;
    await act(id, "TAMAMLANDI", result.assets);
  }

  return (
    <Screen title="Duyurular" subtitle="Okuyun, işleme alın, tamamlayın" menuItems={STORE_MENU}>
      {items.map((a) => {
        const status = a.receipt?.status ?? "BEKLIYOR";
        const busy = loadingId === a.id;
        return (
          <Card key={a.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
              <Text style={styles.cardTitle}>{a.title}</Text>
              <StatusPill
                label={ANNOUNCEMENT_RECEIPT_STATUS_LABELS[status]}
                backgroundColor={STATUS_COLORS[status]}
              />
            </View>
            <Text style={styles.cardBody}>{a.body}</Text>
            {Array.isArray(a.attachments) &&
              a.attachments.map((att, i) => (
                <Text key={i} style={{ color: colors.primary, marginTop: 8 }} onPress={() => Linking.openURL(att.url)}>
                  {att.label}
                </Text>
              ))}
            {(a.receipt?.completionImages?.length ?? 0) > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {a.receipt!.completionImages.map((url) => (
                  <Image
                    key={url}
                    source={{ uri: `${API_URL}${thumbUrl(url)!}` }}
                    style={{ width: 72, height: 72, borderRadius: 8 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ))}
              </View>
            )}
            <View style={{ marginTop: 12, gap: 8 }}>
              {status === "BEKLIYOR" && (
                <PrimaryButton label={busy ? "..." : "Okudum"} onPress={() => act(a.id, "OKUNDU")} loading={busy} />
              )}
              {(status === "BEKLIYOR" || status === "OKUNDU") && (
                <SecondaryButton label="İşleme Al" onPress={() => act(a.id, "ISLEME_ALINDI")} />
              )}
              {status === "ISLEME_ALINDI" && (
                <>
                  <PrimaryButton label="Galeriden Görsel Ekle ve Tamamla" onPress={() => completeWithPhotos(a.id)} />
                  <SecondaryButton label="Kamera ile Çek ve Tamamla" onPress={async () => {
                    const permission = await ImagePicker.requestCameraPermissionsAsync();
                    if (!permission.granted) return Alert.alert("İzin gerekli");
                    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
                    if (!result.canceled && result.assets[0]) {
                      await act(a.id, "TAMAMLANDI", result.assets);
                    }
                  }} />
                </>
              )}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
