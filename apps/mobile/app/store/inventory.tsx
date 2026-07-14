import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/app-header";
import { NotificationBell } from "@/components/notification-bell";
import { colors, radius, spacing, shadow } from "@/components/theme";
import { DeveloperFooter } from "@/components/developer-footer";
import { STORE_MENU } from "@/lib/menus";

export default function StoreInventoryHub() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.pad}>
        <AppHeader title="Envanter" subtitle="Hızlı erişim menüsü" menuItems={STORE_MENU} right={<NotificationBell />} />
        {[
          { href: "/store/avm", label: "AVM Alanları", desc: "Vitrin ve ekstra alan kayıtları" },
          { href: "/store/outdoor", label: "Açık Hava", desc: "Ayrı açık hava envanteri" },
          { href: "/store/signage", label: "Mağaza İçi Reklamlar", desc: "Tabela, lightbox, folyo, görsel" },
          { href: "/store/catalog", label: "Ürün Talepleri", desc: "Katalog ürün talepleri" },
          { href: "/store/requests", label: "Görsel Değişim Talepleri", desc: "Talep durumu ve görsel yükleme" },
        ].map((item) => (
          <Pressable key={item.href} style={styles.card} onPress={() => router.push(item.href as never)}>
            <Text style={styles.cardTitle}>{item.label}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </Pressable>
        ))}
        <DeveloperFooter />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: { flex: 1, padding: spacing.md },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.card,
  },
  cardTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  cardDesc: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
