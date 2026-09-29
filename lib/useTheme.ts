import { useEffect, useMemo, useState } from "react";
import { Appearance, type ColorSchemeName } from "react-native";
import { vars } from "nativewind";
import { darkColors, lightColors, type ThemePalette } from "@/constants/theme";
import { useThemeStore, type ThemeMode } from "@/stores/useThemeStore";

export interface Theme {
  mode: ThemeMode;
  resolved: "light" | "dark";
  colors: ThemePalette;
}

function useResolvedScheme(mode: ThemeMode): "light" | "dark" {
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName | null | undefined>(
    Appearance.getColorScheme()
  );

  useEffect(() => {
    if (mode !== "system") return;
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, [mode]);

  return mode === "system"
    ? systemScheme === "light"
      ? "light"
      : "dark"
    : mode;
}

export function useTheme(): Theme {
  const mode = useThemeStore((s) => s.mode);
  const resolved = useResolvedScheme(mode);

  return useMemo(
    () => ({
      mode,
      resolved,
      colors: resolved === "light" ? lightColors : darkColors,
    }),
    [mode, resolved],
  );
}

/** Maps a palette key like `textSecondary` to the CSS var `--text-secondary`. */
function toVarName(key: string) {
  return `--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

function hexToRgbChannels(hex: string) {
  const n = parseInt(hex.slice(1, 7), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function paletteToVars(palette: ThemePalette) {
  const out: Record<string, string> = {};
  for (const [key, hex] of Object.entries(palette)) {
    out[toVarName(key)] = hexToRgbChannels(hex);
  }
  return out;
}

const LIGHT_VARS = paletteToVars(lightColors);
const DARK_VARS = paletteToVars(darkColors);

export function useThemeVars() {
  const mode = useThemeStore((s) => s.mode);
  const resolved = useResolvedScheme(mode);
  return useMemo(
    () => vars(resolved === "light" ? LIGHT_VARS : DARK_VARS),
    [resolved]
  );
}
