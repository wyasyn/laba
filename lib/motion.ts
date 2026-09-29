import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { Easing, FadeInDown, type WithSpringConfig } from "react-native-reanimated";

/**
 * Shared motion language. Every animated interaction in the app should pull
 * from here so the whole UI moves with one feel. Reanimated honours the OS
 * reduce-motion setting for these by default.
 */
export const spring = {
  /** Press feedback, toggles: quick and tight. */
  snappy: { damping: 20, stiffness: 320, mass: 0.6 },
  /** Layout and position changes. */
  gentle: { damping: 22, stiffness: 180, mass: 0.9 },
  /** Playful confirmation (favourite heart). */
  bouncy: { damping: 9, stiffness: 260, mass: 0.7 },
} satisfies Record<string, WithSpringConfig>;

export const duration = {
  fast: 160,
  base: 260,
  slow: 420,
} as const;

export const easing = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  out: Easing.out(Easing.cubic),
} as const;

/** Staggered entrance for list sections and hero content. */
export function enterFromBelow(index = 0) {
  return FadeInDown.duration(duration.slow)
    .delay(80 + index * 60)
    .easing(easing.standard);
}

const canHaptic = Platform.OS === "ios" || Platform.OS === "android";

export const haptic = {
  tap: () => {
    if (canHaptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  select: () => {
    if (canHaptic) Haptics.selectionAsync().catch(() => {});
  },
  success: () => {
    if (canHaptic)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};
