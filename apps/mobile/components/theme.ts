import { APP_THEME } from "@magaza/shared";

export const colors = {
  bg: APP_THEME.background,
  bgCard: APP_THEME.card,
  bgInput: APP_THEME.muted,
  bgElevated: APP_THEME.card,
  border: APP_THEME.border,
  borderLight: APP_THEME.border,
  primary: APP_THEME.primary,
  primaryDark: APP_THEME.primaryDark,
  accent: APP_THEME.accent,
  accentForeground: APP_THEME.accentForeground,
  accentSoft: APP_THEME.accent,
  accentMuted: APP_THEME.accentMuted,
  sidebar: APP_THEME.sidebar,
  sidebarMuted: APP_THEME.sidebarMuted,
  sidebarForeground: APP_THEME.sidebarForeground,
  white: "#FFFFFF",
  onPrimary: APP_THEME.primaryForeground,
  text: APP_THEME.foreground,
  textMuted: APP_THEME.mutedForeground,
  textDim: APP_THEME.sidebarMuted,
  success: APP_THEME.success,
  successSoft: APP_THEME.successSoft,
  warning: APP_THEME.warning,
  warningSoft: APP_THEME.warningSoft,
  info: APP_THEME.info,
  infoSoft: APP_THEME.infoSoft,
  destructive: APP_THEME.destructive,
  loginBg: APP_THEME.loginBg,
  loginBgMid: APP_THEME.loginBgMid,
  shadow: "rgba(15, 23, 42, 0.08)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
};

export const shadow = {
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
};
