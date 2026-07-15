import { useEffect, useState } from "react";
import { Text, Linking, Pressable, View, Alert } from "react-native";
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
      const d = await api.get<PaginatedResponse<Announcement>>("/api/v1/announcements");
      setItems(d.items);
    } catch {
      /* handled globally */
    }
  }

  useEffect(() => {
    load();
  }, []);

  function patchLocal(id: string, updated: Partial<Receipt> & { id?: string; status?: AnnouncementReceiptStatus }) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              receipt: {
                id: updated.id ?? item.receipt?.id ?? "",
                status: (updated.status ?? item.receipt?.status ?? "BEKLIYOR") as AnnouncementReceiptStatus,
                completionImages: updated.completionImages ?? item.receipt?.completionImages ?? [],
              },
            }
          : item
      )
    );
  }

  async function pickImages(multiple: boolean) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("İzin gerekli", "Galeri izni verilmeli");
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: multiple,
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      selectionLimit: multiple ? 20 : 1,
    });
    if (result.canceled || !result.assets.length) return null;
    return result.assets;
  }

  async function postStatus(id: string, action: "OKUNDU" | "ISLEME_ALINDI" | "TAMAMLANDI", files?: ImagePicker.ImagePickerAsset[]) {
    if (loadingId) return;
    setLoadingId(id);
    try {
      let res: Response;
      if (action === "TAMAMLANDI") {
        const existing =
          items.find((x) => x.id === id)?.receipt?.completionImages?.length ?? 0;
        if (!files?.length && !existing) {
          Alert.alert("Görsel gerekli", "Tamamlama için en az bir fotoğraf seçin");
          return;
        }
        const form = new FormData();
        form.append("action", action);
        (files ?? []).forEach((file, i) => {
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
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getToken()}`,
          },
          body: JSON.stringify({ action }),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Alert.alert("Hata", err.error ?? "İşlem başarısız");
        return;
      }
      const updated = await res.json().catch(() => null);
      if (updated) patchLocal(id, updated);
      await load();
    } finally {
      setLoadingId(null);
    }
  }

  async function patchImages(
    id: string,
    action: "ADD_IMAGES" | "REMOVE_IMAGE" | "REPLACE_IMAGE",
    opts?: { imageUrl?: string; files?: ImagePicker.ImagePickerAsset[] }
  ) {
    if (loadingId) return;
    setLoadingId(id);
    try {
      const token = await getToken();
      let res: Response;
      if (action === "REMOVE_IMAGE") {
        res = await fetch(`${API_URL}/api/v1/announcements/${id}/receipt`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({ action, imageUrl: opts?.imageUrl }),
        });
      } else {
        const form = new FormData();
        form.append("action", action);
        if (opts?.imageUrl) form.append("imageUrl", opts.imageUrl);
        (opts?.files ?? []).forEach((file, i) => {
          form.append(`file_${i}`, {
            uri: file.uri,
            name: `completion_${i}.jpg`,
            type: "image/jpeg",
          } as unknown as Blob);
        });
        res = await fetch(`${API_URL}/api/v1/announcements/${id}/receipt`, {
          method: "PATCH",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Alert.alert("Hata", err.error ?? "İşlem başarısız");
        return;
      }
      const updated = await res.json().catch(() => null);
      if (updated) patchLocal(id, updated);
      await load();
    } finally {
      setLoadingId(null);
    }
  }

  async function addImages(id: string) {
    const assets = await pickImages(true);
    if (!assets) return;
    await patchImages(id, "ADD_IMAGES", { files: assets });
  }

  async function completeWithPhotos(id: string) {
    const assets = await pickImages(true);
    if (!assets) return;
    await postStatus(id, "TAMAMLANDI", assets);
  }

  async function removeImage(id: string, imageUrl: string) {
    Alert.alert("Görseli sil", "Bu görsel silinsin mi?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => {
          void patchImages(id, "REMOVE_IMAGE", { imageUrl });
        },
      },
    ]);
  }

  async function replaceImage(id: string, imageUrl: string) {
    const assets = await pickImages(false);
    if (!assets?.[0]) return;
    await patchImages(id, "REPLACE_IMAGE", { imageUrl, files: [assets[0]] });
  }

  return (
    <Screen title="Duyurular" subtitle="Okuyun, işleme alın, tamamlayın" menuItems={STORE_MENU}>
      {items.map((a) => {
        const status = a.receipt?.status ?? "BEKLIYOR";
        const busy = loadingId === a.id;
        const images = a.receipt?.completionImages ?? [];
        const canManage = status === "ISLEME_ALINDI" || status === "TAMAMLANDI";
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

            {images.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {images.map((url) => (
                  <View key={url} style={{ width: 80 }}>
                    <Image
                      source={{ uri: `${API_URL}${thumbUrl(url)!}` }}
                      style={{ width: 80, height: 80, borderRadius: 8 }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    {canManage && (
                      <View style={{ marginTop: 4, gap: 4 }}>
                        <Pressable
                          disabled={busy}
                          onPress={() => replaceImage(a.id, url)}
                          style={{ backgroundColor: "#e2e8f0", borderRadius: 6, paddingVertical: 4 }}
                        >
                          <Text style={{ textAlign: "center", fontSize: 11 }}>Değiştir</Text>
                        </Pressable>
                        <Pressable
                          disabled={busy}
                          onPress={() => removeImage(a.id, url)}
                          style={{ backgroundColor: "#fecaca", borderRadius: 6, paddingVertical: 4 }}
                        >
                          <Text style={{ textAlign: "center", fontSize: 11, color: "#991b1b" }}>Sil</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            <View style={{ marginTop: 12, gap: 8 }}>
              {status === "BEKLIYOR" && (
                <PrimaryButton
                  label={busy ? "..." : "Okudum"}
                  onPress={() => postStatus(a.id, "OKUNDU")}
                  loading={busy}
                />
              )}
              {status === "OKUNDU" && (
                <SecondaryButton
                  label="İşleme Al"
                  onPress={() => {
                    if (!busy) postStatus(a.id, "ISLEME_ALINDI");
                  }}
                />
              )}
              {status === "ISLEME_ALINDI" && (
                <>
                  <PrimaryButton
                    label={busy ? "Yükleniyor..." : "Galeriden seç ve tamamla (toplu)"}
                    onPress={() => completeWithPhotos(a.id)}
                    loading={busy}
                  />
                  {images.length > 0 && (
                    <PrimaryButton
                      label={busy ? "..." : "Mevcut görsellerle tamamla"}
                      onPress={() => postStatus(a.id, "TAMAMLANDI")}
                      loading={busy}
                    />
                  )}
                  <SecondaryButton
                    label="Görsel ekle (galeri)"
                    onPress={() => {
                      if (!busy) addImages(a.id);
                    }}
                  />
                  <SecondaryButton
                    label={busy ? "Bekleyin..." : "Kamera ile çek"}
                    onPress={async () => {
                      if (busy) return;
                      const permission = await ImagePicker.requestCameraPermissionsAsync();
                      if (!permission.granted) return Alert.alert("İzin gerekli");
                      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
                      if (!result.canceled && result.assets[0]) {
                        await postStatus(a.id, "TAMAMLANDI", result.assets);
                      }
                    }}
                  />
                </>
              )}
              {status === "TAMAMLANDI" && (
                <>
                  <PrimaryButton
                    label={busy ? "Yükleniyor..." : "Görsel ekle (toplu)"}
                    onPress={() => addImages(a.id)}
                    loading={busy}
                  />
                  <SecondaryButton
                    label={busy ? "Bekleyin..." : "Kamera ile ekle"}
                    onPress={async () => {
                      if (busy) return;
                      const permission = await ImagePicker.requestCameraPermissionsAsync();
                      if (!permission.granted) return Alert.alert("İzin gerekli");
                      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
                      if (!result.canceled && result.assets[0]) {
                        await patchImages(a.id, "ADD_IMAGES", { files: result.assets });
                      }
                    }}
                  />
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                    Görsellere basarak Değiştir / Sil yapabilirsiniz.
                  </Text>
                </>
              )}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
