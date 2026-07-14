import { Text, StyleSheet } from "react-native";
import { DEVELOPER_CREDIT } from "@magaza/shared";
import { colors, spacing } from "./theme";

export function DeveloperFooter({ light }: { light?: boolean }) {
  return <Text style={[styles.text, light && styles.textLight]}>{DEVELOPER_CREDIT}</Text>;
}

const styles = StyleSheet.create({
  text: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textAlign: "center",
    fontSize: 11,
    color: colors.textDim,
    letterSpacing: 0.2,
  },
  textLight: {
    color: colors.sidebarMuted,
  },
});
