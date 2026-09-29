export const darkColors = {
  background: "#09090D",
  surface: "#131319",
  surfaceLight: "#1B1B23",
  surfaceElevated: "#22222C",
  primary: "#E50914",
  primaryLight: "#FF2D38",
  textPrimary: "#F5F5F7",
  textSecondary: "#9A9AAB",
  textTertiary: "#62627A",
  border: "#24242F",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
} as const;

export const lightColors = {
  background: "#F5F5F8",
  surface: "#FFFFFF",
  surfaceLight: "#EDEDF2",
  surfaceElevated: "#FFFFFF",
  primary: "#E50914",
  primaryLight: "#FF2D38",
  textPrimary: "#0B0B10",
  textSecondary: "#5F5F74",
  textTertiary: "#9A9AAB",
  border: "#E3E3EA",
  success: "#16A34A",
  warning: "#D97706",
  error: "#DC2626",
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
