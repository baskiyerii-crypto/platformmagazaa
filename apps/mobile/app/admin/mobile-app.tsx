import { useEffect, useState } from "react";
import { Text, Alert } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Screen, Card, PrimaryButton, styles } from "@/components/ui";
import { api, getToken } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import { ADMIN_MENU } from "@/lib/menus";

type ReleaseInfo = {
  platform: "ANDROID" | "IOS";
  version: string;
  buildNumber: number;
  fileName: string;
  fileSize: number;
  updatedAt: string;
  installLink?: string;
};

type MobileAppResponse = {
  android: ReleaseInfo | null;
  ios: ReleaseInfo | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminMobileApp() {
  const [data, setData] = useState<MobileAppResponse | null>(null);
  const [loading, setLoading] = useState<"ANDROID" | "IOS" | null>(null);

  useEffect(() => {
    api.get<MobileAppResponse>("/api/v1/admin/mobile-app").then(setData).catch(() => {});
  }, []);

  async function download(platform: "ANDROID" | "IOS") {
    setLoading(platform);
    try {
      const token = await getToken();
      const ext = platform === "ANDROID" ? "apk" : "ipa";
      const path = `${FileSystem.cacheDirectory}magaza.${ext}`;
      const result = await FileSystem.downloadAsync(
        `${API_URL}/api/v1/admin/mobile-app/download?platform=${platform}`,
        path,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      if (result.status !== 200) throw new Error("İndirilemedi");
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: platform === "ANDROID"
            ? "application/vnd.android.package-archive"
            : "application/octet-stream",
        });
      } else {
        Alert.alert("Başarılı", result.uri);
      }
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "İndirilemedi");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Screen title="Mobil Uygulama" subtitle="APK ve Ad Hoc IPA" menuItems={ADMIN_MENU}>
      <Card>
        <Text style={styles.cardTitle}>Android (APK)</Text>
        {data?.android ? (
          <>
            <Text style={styles.cardBody}>
              v{data.android.version} · {formatBytes(data.android.fileSize)}
            </Text>
            <PrimaryButton
              label={loading === "ANDROID" ? "İndiriliyor..." : "APK İndir"}
              onPress={() => download("ANDROID")}
            />
          </>
        ) : (
          <Text style={styles.cardBody}>APK henüz hazır değil.</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>iOS (Ad Hoc IPA)</Text>
        {data?.ios ? (
          <>
            <Text style={styles.cardBody}>
              v{data.ios.version} · {formatBytes(data.ios.fileSize)}
            </Text>
            <PrimaryButton
              label={loading === "IOS" ? "İndiriliyor..." : "IPA İndir"}
              onPress={() => download("IOS")}
            />
          </>
        ) : (
          <Text style={styles.cardBody}>IPA henüz hazır değil.</Text>
        )}
      </Card>
    </Screen>
  );
}
