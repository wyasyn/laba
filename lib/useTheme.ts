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

  return {
    mode,
    resolved,
    colors: resolved === "light" ? lightColors : darkColors,
  };
}

const LIGHT_VARS = {
  "--background": "242 242 245",
  "--surface": "255 255 255",
  "--surface-light": "247 247 250",
  "--primary": "229 9 20",
  "--primary-light": "255 45 56",
  "--text-primary": "10 10 15",
  "--text-secondary": "107 107 123",
  "--border": "224 224 230",
  "--success": "22 163 74",
  "--warning": "217 119 6",
  "--error": "220 38 38",
};

const DARK_VARS = {
  "--background": "10 10 15",
  "--surface": "22 22 30",
  "--surface-light": "30 30 42",
  "--primary": "229 9 20",
  "--primary-light": "255 45 56",
  "--text-primary": "255 255 255",
  "--text-secondary": "160 160 176",
  "--border": "42 42 58",
  "--success": "34 197 94",
  "--warning": "245 158 11",
  "--error": "239 68 68",
};

export function useThemeVars() {
  const mode = useThemeStore((s) => s.mode);
  const resolved = useResolvedScheme(mode);
  return useMemo(
    () => vars(resolved === "light" ? LIGHT_VARS : DARK_VARS),
    [resolved]
  );
}
