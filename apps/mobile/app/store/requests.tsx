import { useEffect, useState, useCallback } from "react";
import { Text, View, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ListScreen } from "@/components/list-screen";
import { Card, PrimaryButton, StatusPill, styles } from "@/components/ui";
import { api, getToken } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import { STORE_MENU } from "@/lib/menus";
import {
  CHANGE_REQUEST_STATUS_LABELS,
  canStoreUploadImage,
  changeTargetTypeLabel,
  type ChangeRequestStatus,
  type PaginatedResponse,
} from "@magaza/shared";

type Request = {
  id: string;
  status: ChangeRequestStatus;
  targetType: string;
  note?: string | null;
};

export default function StoreRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<PaginatedResponse<Request>>("/api/v1/change-requests");
      setRequests(data.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadImage(id: string) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("İzin gerekli", "Kamera izni verilmeli");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;

    const formData = new FormData();
    formData.append("file", {
      uri: result.assets[0].uri,
      name: "update.jpg",
      type: "image/jpeg",
    } as unknown as Blob);

    const token = await getToken();
    const res = await fetch(`${API_URL}/api/v1/change-requests/${id}/upload-image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) {
      Alert.alert("Hata", "Görsel yüklenemedi");
      return;
    }

    load();
    Alert.alert("Başarılı", "Görsel yüklendi, müdür onayı bekleniyor");
  }

  const renderItem = useCallback(({ item: req }: { item: Request }) => (
    <Card>
      <Text style={styles.cardTitle}>{changeTargetTypeLabel(req.targetType)}</Text>
      {req.note ? <Text style={styles.cardBody}>{req.note}</Text> : null}
      {req.status === "GUNCELLEME_YUKLENDI" && (
        <Text style={[styles.cardBody, { color: "#B45309", marginTop: 8 }]}>
          Müdür onayı bekleniyor
        </Text>
      )}
      <View style={{ marginTop: 12 }}>
        <StatusPill label={CHANGE_REQUEST_STATUS_LABELS[req.status]} backgroundColor="#D1FAE5" />
      </View>
      {canStoreUploadImage(req.status) && (
        <View style={styles.cardActions}>
          <PrimaryButton label="Görseli Değiştir" onPress={() => uploadImage(req.id)} />
        </View>
      )}
    </Card>
  ), []);

  return (
    <ListScreen
      title="Taleplerim"
      subtitle="Durum takibi ve görsel yükleme"
      menuItems={STORE_MENU}
      data={requests}
      renderItem={renderItem}
      keyExtractor={(req) => req.id}
      loading={loading}
    />
  );
}
