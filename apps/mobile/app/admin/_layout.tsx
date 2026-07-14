import { Stack } from "expo-router";
import { colors } from "@/components/theme";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="catalog" />
      <Stack.Screen name="stores" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="media" />
      <Stack.Screen name="definitions" />
      <Stack.Screen name="support" />
      <Stack.Screen name="export" />
    </Stack>
  );
}
