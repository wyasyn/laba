export const darkColors = {
  background: "#0C0C09",
  surface: "#1D1D16",
  surfaceLight: "#2B2B22",
  surfaceElevated: "#2B2B22",
  primary: "#E8E8E3",
  primaryLight: "#FBFBF9",
  /** Text and icons drawn on a primary fill. */
  onPrimary: "#1D1D16",
  textPrimary: "#FBFBF9",
  textSecondary: "#ABAB9C",
  textTertiary: "#7C7C67",
  border: "#242422",
  success: "#34D399",
  warning: "#FBBF24",
  error: "#FF6467",
} as const;

export const lightColors = {
  background: "#FFFFFF",
  surface: "#F8F8F4",
  surfaceLight: "#EEEEE9",
  surfaceElevated: "#FFFFFF",
  primary: "#1D1D16",
  primaryLight: "#474739",
  /** Text and icons drawn on a primary fill. */
  onPrimary: "#FBFBF9",
  textPrimary: "#0C0C09",
  textSecondary: "#7C7C67",
  textTertiary: "#ABAB9C",
  border: "#E8E8E3",
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
