import { Text, Pressable, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useNotifications } from "./notification-provider";
import { colors, radius, shadow } from "./theme";

export function NotificationBell() {
  const { unread } = useNotifications();
  const router = useRouter();

  return (
    <Pressable style={styles.wrap} onPress={() => router.push("/notifications" as never)}>
      <Text style={styles.icon}>🔔</Text>
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  icon: { fontSize: 20 },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.destructive,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: "700" },
});
