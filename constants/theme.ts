export const darkColors = {
  background: "#121212",
  surface: "#1E1E1E",
  surfaceLight: "#282828",
  surfaceElevated: "#2E2E2E",
  primary: "#EDEDED",
  primaryLight: "#FAFAFA",
  /** Text and icons drawn on a primary fill. */
  onPrimary: "#171717",
  textPrimary: "#FAFAFA",
  textSecondary: "#A3A3A3",
  textTertiary: "#737373",
  border: "#262626",
  success: "#34D399",
  warning: "#FBBF24",
  error: "#FF6467",
} as const;

export const lightColors = {
  background: "#FFFFFF",
  surface: "#F5F5F5",
  surfaceLight: "#EDEDED",
  surfaceElevated: "#FFFFFF",
  primary: "#171717",
  primaryLight: "#404040",
  /** Text and icons drawn on a primary fill. */
  onPrimary: "#FAFAFA",
  textPrimary: "#0A0A0A",
  textSecondary: "#737373",
  textTertiary: "#A3A3A3",
  border: "#E5E5E5",
  success: "#10B981",
  warning: "#D97706",
  error: "#E7000B",
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
