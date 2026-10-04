import { useTheme } from "@/lib/useTheme";
import { withAlpha } from "@/constants/theme";
import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

interface GlassViewProps {
  children?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  /** Force a dark glass regardless of theme (for overlays on artwork/video). */
  dark?: boolean;
}

/**
 * Frosted surface. Real blur on iOS; on Android a tinted translucent fill,
 * which reads the same at a glance and costs nothing.
 */
export function GlassView({ children, className, style, intensity = 40, dark }: GlassViewProps) {
  const { resolved, colors } = useTheme();
  const isDark = dark || resolved === "dark";

  if (Platform.OS === "ios") {
    return (
      <View className={className} style={[styles.clip, style]}>
        <BlurView
          intensity={intensity}
          tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    );
  }

  const fill = dark
    ? "rgba(10,10,14,0.55)"
    : withAlpha(colors.surfaceElevated, isDark ? 0.92 : 0.94);

  return (
    <View className={className} style={[styles.clip, { backgroundColor: fill }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
});
