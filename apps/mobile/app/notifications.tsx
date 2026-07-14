import { useEffect, useState } from "react";
import { Text, Pressable } from "react-native";
import { ListScreen } from "@/components/list-screen";
import { Card, styles } from "@/components/ui";
import { colors, spacing } from "@/components/theme";
import { api, getUser } from "@/lib/auth";
import { ADMIN_MENU, STORE_MENU } from "@/lib/menus";
import { useNotifications } from "@/components/notification-provider";
import { isStaffRole, type PaginatedResponse } from "@magaza/shared";

type Notification = {
  id: string;
  title: string;
  body: string;
  readAt?: string | null;
};

export default function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState(STORE_MENU);
  const { refresh } = useNotifications();

  async function load() {
    setLoading(true);
    const d = await api.getCached<PaginatedResponse<Notification>>("/api/v1/notifications?limit=50", 30_000);
    setItems(d.items);
    setLoading(false);
  }

  useEffect(() => {
    getUser().then((user) => {
      setMenuItems(user && isStaffRole(user.role) ? ADMIN_MENU : STORE_MENU);
    });
    load();
  }, []);

  async function markAll() {
    await api.patch("/api/v1/notifications", { markAll: true });
    await load();
    await refresh();
  }

  return (
    <ListScreen
      title="Bildirimler"
      subtitle="Tüm bildirimleriniz"
      menuItems={menuItems}
      data={items}
      loading={loading}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Pressable onPress={markAll} style={{ marginBottom: spacing.md }}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>Tümünü okundu işaretle</Text>
        </Pressable>
      }
      renderItem={({ item: n }) => (
        <Card>
          <Text style={[styles.cardTitle, !n.readAt && { color: colors.primary }]}>{n.title}</Text>
          <Text style={styles.cardBody}>{n.body}</Text>
        </Card>
      )}
    />
  );
}
