import { ReactNode, useState } from "react";
import { View, Text, Modal, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { colors, radius, spacing, shadow } from "./theme";
import { clearAuth } from "@/lib/auth";

type MenuItem = { href: string; label: string };

export function AppHeader({
  title,
  subtitle,
  menuItems,
  right,
}: {
  title: string;
  subtitle?: string;
  menuItems: MenuItem[];
  right?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin" || href === "/store") return pathname === href;
    return pathname.startsWith(href);
  }

  async function logout() {
    setOpen(false);
    await clearAuth();
    router.replace("/login");
  }

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setOpen(true)} style={styles.menuBtn} activeOpacity={0.85}>
          <View style={styles.menuLine} />
          <View style={[styles.menuLine, styles.menuLineShort]} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={styles.drawer}>
          <Text style={styles.drawerTitle}>Mağaza Platform</Text>
          <Text style={styles.drawerHint}>Menü</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.drawerScroll}>
            {menuItems.map((item) => {
              const active = isActive(item.href);
              return (
                <TouchableOpacity
                  key={item.href}
                  style={[styles.drawerItem, active && styles.drawerItemActive]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setOpen(false);
                    router.push(item.href as never);
                  }}
                >
                  <Text style={[styles.drawerItemText, active && styles.drawerItemTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.logoutButton} activeOpacity={0.85} onPress={logout}>
            <Text style={styles.logoutText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.sidebar,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  menuLine: {
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.white,
  },
  menuLineShort: { width: 13, alignSelf: "flex-start", marginLeft: 13 },
  titleWrap: { flex: 1 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  overlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.55)" },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "82%",
    maxWidth: 320,
    backgroundColor: colors.sidebar,
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  drawerTitle: { fontSize: 18, fontWeight: "700", color: colors.sidebarForeground, letterSpacing: -0.3 },
  drawerHint: { fontSize: 12, color: colors.sidebarMuted, marginTop: 4, marginBottom: spacing.lg, textTransform: "uppercase", letterSpacing: 0.6 },
  drawerScroll: { flex: 1 },
  drawerItem: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: 4,
  },
  drawerItemActive: { backgroundColor: colors.primary },
  drawerItemText: { fontSize: 15, color: colors.sidebarMuted, fontWeight: "500" },
  drawerItemTextActive: { color: colors.onPrimary, fontWeight: "700" },
  logoutButton: {
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
  },
  logoutText: { color: colors.sidebarForeground, fontSize: 14, fontWeight: "600" },
});
