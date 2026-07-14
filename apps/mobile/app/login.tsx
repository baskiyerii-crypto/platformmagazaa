import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { isStaffRole } from "@magaza/shared";
import { api, setAuth } from "../lib/auth";
import { registerForPushNotifications } from "../lib/notifications";
import { API_URL } from "../lib/config";
import { colors, radius, spacing } from "../components/theme";
import { DeveloperFooter } from "../components/developer-footer";
import type { LoginResponse } from "@magaza/api-client";

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverOk, setServerOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/health/db`)
      .then((r) => r.ok)
      .then(setServerOk)
      .catch(() => setServerOk(false));
  }, []);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Hata", "Kullanıcı adı ve şifre gerekli");
      return;
    }

    setLoading(true);
    try {
      const data = await api.post<LoginResponse>("/api/v1/auth/login", {
        username: username.trim(),
        password,
      });
      await setAuth(data.token, data.user, data.refreshToken);
      await registerForPushNotifications();
      router.replace(isStaffRole(data.user.role) ? "/admin" : "/store");
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.bgGlow} pointerEvents="none" />
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.logoWrap}>
          <View style={s.logo}>
            <Text style={s.logoLetter}>M</Text>
          </View>
          <Text style={s.heading}>Mağaza Platform</Text>
          <Text style={s.sub}>Envanter ve mağaza yönetimi</Text>
          {serverOk === false ? (
            <Text style={s.serverError}>
              Sunucuya ulaşılamıyor: {API_URL}
              {"\n"}Web: pnpm --filter @magaza/web dev
            </Text>
          ) : null}
          {serverOk === true ? (
            <Text style={s.serverOk}>Sunucu bağlantısı OK</Text>
          ) : null}
        </View>

        <View style={s.card}>
          <Text style={s.label}>Kullanıcı Adı</Text>
          <TextInput
            style={s.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Kullanıcı adınız"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={s.label}>Şifre</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textDim}
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={[s.button, loading && s.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={s.buttonText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>
        </View>
        <DeveloperFooter light />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.loginBg },
  bgGlow: {
    position: "absolute",
    top: "20%",
    left: "-20%",
    right: "-20%",
    height: "50%",
    borderRadius: 999,
    backgroundColor: colors.loginBgMid,
    opacity: 0.85,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  logoWrap: { alignItems: "center", marginBottom: spacing.lg },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logoLetter: { fontSize: 28, fontWeight: "800", color: colors.onPrimary },
  heading: { fontSize: 24, fontWeight: "700", color: colors.white, letterSpacing: -0.5 },
  sub: { marginTop: spacing.sm, fontSize: 14, color: colors.sidebarMuted, textAlign: "center" },
  serverError: {
    marginTop: spacing.md,
    fontSize: 12,
    color: "#B91C1C",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },
  serverOk: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: "#86EFAC",
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    minHeight: 50,
    marginBottom: spacing.sm,
  },
  button: {
    marginTop: spacing.md,
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: "700" },
});
