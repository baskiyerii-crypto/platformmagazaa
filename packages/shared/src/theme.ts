/**
 * Web globals.css (Tailwind CSS variables) ile birebir uyumlu renk paleti.
 * Mobil ve web aynı marka renklerini kullanır.
 */
export const APP_THEME = {
  background: "#E8EEF5",
  foreground: "#0F172A",
  card: "#F5F8FC",
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryForeground: "#F8FAFC",
  secondary: "#E2E8F0",
  muted: "#F1F5F9",
  mutedForeground: "#64748B",
  accent: "#DBEAFE",
  accentForeground: "#1E40AF",
  accentMuted: "#BFDBFE",
  border: "#CBD5E1",
  sidebar: "#0F172A",
  sidebarForeground: "#F1F5F9",
  sidebarMuted: "#94A3B8",
  destructive: "#EF4444",
  success: "#059669",
  successSoft: "#ECFDF5",
  warning: "#D97706",
  warningSoft: "#FFFBEB",
  info: "#2563EB",
  infoSoft: "#EFF6FF",
  loginBg: "#0F172A",
  loginBgMid: "#172554",
} as const;

export type AppTheme = typeof APP_THEME;
