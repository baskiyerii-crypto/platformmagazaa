import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "./app-header";
import { NotificationBell } from "./notification-bell";
import { DeveloperFooter } from "./developer-footer";
import type { MenuItem } from "@/lib/menus";
import { colors, radius, spacing, shadow } from "./theme";

export function Screen({
  children,
  title,
  subtitle,
  menuItems,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  menuItems?: MenuItem[];
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {menuItems ? (
            <AppHeader title={title} subtitle={subtitle} menuItems={menuItems} right={<NotificationBell />} />
          ) : (
            <>
              <Text style={styles.screenTitle}>{title}</Text>
              {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
            </>
          )}
          <View style={styles.screenBody}>{children}</View>
          <DeveloperFooter />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  loading,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      style={[styles.primaryBtn, loading && styles.btnDisabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.primaryBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export function SecondaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.secondaryBtn}>
      <Text style={styles.secondaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function InputField({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = "default",
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "numeric";
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        autoCapitalize="none"
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statAccent} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function StatusPill({
  label,
  backgroundColor,
}: {
  label: string;
  backgroundColor: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor }]}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md + 4, paddingTop: spacing.md, paddingBottom: spacing.xl },
  screenTitle: { fontSize: 24, fontWeight: "700", color: colors.text },
  screenSubtitle: { marginTop: spacing.xs, fontSize: 14, color: colors.textMuted },
  screenBody: { marginTop: spacing.lg },
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 16, fontWeight: "600", color: colors.white },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  secondaryBtnText: { fontSize: 16, fontWeight: "500", color: colors.text },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: { marginBottom: spacing.sm, fontSize: 14, fontWeight: "500", color: colors.textMuted },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgInput,
    fontSize: 16,
    color: colors.text,
  },
  inputMultiline: { minHeight: 96, paddingTop: 14 },
  statCard: {
    flex: 1,
    minWidth: "46%",
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadow.card,
  },
  statAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  statValue: { marginTop: spacing.sm, fontSize: 28, fontWeight: "700", color: colors.primary },
  pill: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: "600", color: colors.text },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  cardTitle: { fontSize: 18, fontWeight: "600", color: colors.text },
  cardSubtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  cardBody: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
  cardActions: { marginTop: 12, gap: 8 },
});
