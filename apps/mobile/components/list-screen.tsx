import { useEffect, useState, ReactElement } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "./app-header";
import { NotificationBell } from "./notification-bell";
import { DeveloperFooter } from "./developer-footer";
import type { MenuItem } from "@/lib/menus";
import { colors, spacing } from "./theme";

type Props<T> = {
  title: string;
  subtitle?: string;
  menuItems?: MenuItem[];
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  ListHeaderComponent?: ReactElement | null;
  onEndReached?: () => void;
  loading?: boolean;
  loadingMore?: boolean;
  emptyText?: string;
};

export function ListScreen<T>({
  title,
  subtitle,
  menuItems,
  data,
  renderItem,
  keyExtractor,
  ListHeaderComponent,
  onEndReached,
  loading,
  loadingMore,
  emptyText = "Kayıt yok",
}: Props<T>) {
  return (
    <SafeAreaView style={listStyles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={listStyles.flex}>
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={
            <>
              {menuItems ? (
                <AppHeader title={title} subtitle={subtitle} menuItems={menuItems} right={<NotificationBell />} />
              ) : (
                <>
                  <Text style={listStyles.title}>{title}</Text>
                  {subtitle ? <Text style={listStyles.subtitle}>{subtitle}</Text> : null}
                </>
              )}
              {ListHeaderComponent}
              {loading && data.length === 0 ? (
                <View style={listStyles.loader}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            !loading ? <Text style={listStyles.empty}>{emptyText}</Text> : null
          }
          ListFooterComponent={
            <>
              {loadingMore ? (
                <View style={listStyles.footer}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null}
              <DeveloperFooter />
            </>
          }
          contentContainerStyle={listStyles.content}
          keyboardShouldPersistTaps="handled"
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const listStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.md + 4, paddingBottom: spacing.xl },
  title: { fontSize: 24, fontWeight: "700", color: colors.text, marginTop: spacing.md },
  subtitle: { marginTop: spacing.xs, fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
  loader: { paddingVertical: 40, alignItems: "center" },
  footer: { paddingVertical: 20, alignItems: "center" },
  empty: { textAlign: "center", color: colors.textMuted, paddingVertical: 40 },
});
