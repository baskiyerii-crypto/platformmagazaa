import { useEffect, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { colors, radius, spacing } from "./theme";

type Props = {
  label?: string;
  existingUri?: string | null;
  onPick: (asset: { uri: string; name: string; type: string } | null) => void;
};

export function ImageUploadPreview({ label = "Görsel", existingUri, onPick }: Props) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!preview && existingUri) setPreview(existingUri);
  }, [existingUri, preview]);

  async function pickFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    if (result.canceled || !result.assets[0]) return;
    setPreview(result.assets[0].uri);
    onPick({ uri: result.assets[0].uri, name: "photo.jpg", type: "image/jpeg" });
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true });
    if (result.canceled || !result.assets[0]) return;
    setPreview(result.assets[0].uri);
    onPick({ uri: result.assets[0].uri, name: "photo.jpg", type: "image/jpeg" });
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {preview ? (
        <Image source={{ uri: preview }} style={styles.preview} resizeMode="cover" />
      ) : (
        <View style={[styles.preview, styles.placeholder]}>
          <Text style={styles.placeholderText}>Önizleme</Text>
        </View>
      )}
      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={pickFromCamera}>
          <Text style={styles.btnText}>Kamera</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={pickFromGallery}>
          <Text style={styles.btnText}>Galeri</Text>
        </Pressable>
        {preview && (
          <Pressable
            style={[styles.btn, styles.btnGhost]}
            onPress={() => {
              setPreview(existingUri ?? null);
              onPick(null);
            }}
          >
            <Text style={styles.btnText}>Kaldır</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: "500", color: colors.textMuted, marginBottom: spacing.sm },
  preview: { height: 160, width: "100%", borderRadius: radius.lg, marginBottom: spacing.sm },
  placeholder: { backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  placeholderText: { color: colors.textDim },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: colors.primary },
  btnGhost: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  btnText: { color: colors.white, fontWeight: "600", fontSize: 13 },
});
