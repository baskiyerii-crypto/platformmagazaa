import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../components/theme";
import { isStaffRole } from "@magaza/shared";
import { getUser, initApi, setUnauthorizedHandler, clearAuth } from "../lib/auth";
import { NotificationProvider } from "../components/notification-provider";
import { PushNotificationSetup } from "../components/push-notification-setup";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuth().then(() => router.replace("/login"));
    });
  }, [router]);

  useEffect(() => {
    initApi().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === "login";
    getUser().then((user) => {
      if (!user && !inAuth) {
        router.replace("/login");
      } else if (user && inAuth) {
        router.replace(isStaffRole(user.role) ? "/admin" : "/store");
      }
    });
  }, [ready, segments[0]]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NotificationProvider>
        <PushNotificationSetup />
        <StatusBar style={segments[0] === "login" ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="store" />
          <Stack.Screen name="notifications" />
        </Stack>
      </NotificationProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
});
