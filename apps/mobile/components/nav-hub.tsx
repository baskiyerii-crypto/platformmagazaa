import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, radius, spacing, shadow } from "./theme";

type NavItem = { href: string; label: string; desc?: string };

export function NavHub({ items }: { items: NavItem[] }) {
  const router = useRouter();

  return (
    <View style={hubStyles.grid}>
      {items.map((item) => (
        <Pressable
          key={item.href}
          style={({ pressed }) => [hubStyles.card, pressed && hubStyles.cardPressed]}
          onPress={() => router.push(item.href as never)}
        >
          <Text style={hubStyles.title}>{item.label}</Text>
          {item.desc ? <Text style={hubStyles.desc}>{item.desc}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

const hubStyles = StyleSheet.create({
  grid: { gap: spacing.sm, marginTop: spacing.md },
  card: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    ...shadow.card,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  title: { fontSize: 16, fontWeight: "600", color: colors.text, letterSpacing: -0.2 },
  desc: { marginTop: 4, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
});
