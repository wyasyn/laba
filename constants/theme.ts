export const darkColors = {
  background: "#0F172A",
  surface: "#1E293B",
  surfaceLight: "#2D3748",
  surfaceElevated: "#374151",
  primary: "#818CF8",
  primaryLight: "#A5B4FC",
  /** Text and icons drawn on a primary fill. */
  onPrimary: "#0F172A",
  textPrimary: "#E2E8F0",
  textSecondary: "#9CA3AF",
  textTertiary: "#6B7280",
  border: "#374151",
  success: "#34D399",
  warning: "#FBBF24",
  error: "#EF4444",
} as const;

export const lightColors = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceLight: "#E5E7EB",
  surfaceElevated: "#FFFFFF",
  primary: "#6366F1",
  primaryLight: "#818CF8",
  /** Text and icons drawn on a primary fill. */
  onPrimary: "#FFFFFF",
  textPrimary: "#1E293B",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  border: "#D1D5DB",
  success: "#10B981",
  warning: "#D97706",
  error: "#EF4444",
} as const;

export type ThemePalette = { [K in keyof typeof darkColors]: string };

/** Font family embedded via the expo-font config plugin (weights 400-700). */
export const FONT_FAMILY = "Inter";

/** Appends an alpha channel to a 6-digit hex colour. `alpha` is 0 to 1. */
export function withAlpha(hex: string, alpha: number) {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex.slice(0, 7)}${a}`;
}
