import { Stack } from "expo-router";
import { colors } from "@/components/theme";

export default function StoreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="avm" />
      <Stack.Screen name="outdoor" />
      <Stack.Screen name="signage" />
      <Stack.Screen name="catalog" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="support" />
    </Stack>
  );
}
