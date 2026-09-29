import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "./GlassView";
import { Text } from "./Text";

export const COMPACT_BAR_HEIGHT = 48;
/** Scroll distance over which the large title hands off to the compact bar. */
const HANDOFF: [number, number] = [24, 64];

export function useCollapsingHeader() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  return { scrollY, onScroll };
}

/**
 * Pinned bar that fades in (with a frosted background) once the large title
 * has scrolled away. Place it after the list so it draws on top.
 */
export function CompactHeader({
  title,
  scrollY,
  right,
  divider = true,
  handoff = HANDOFF,
}: {
  title: string;
  scrollY: SharedValue<number>;
  right?: ReactNode;
  /** Hairline under the bar. Turn off when something pins directly below it. */
  divider?: boolean;
  /** Scroll range over which the bar fades in. Defaults to the large title handoff. */
  handoff?: [number, number];
}) {
  const insets = useSafeAreaInsets();

  const bgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), handoff, [0, 1], Extrapolation.CLAMP),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [handoff[1] - 10, handoff[1] + 10], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollY.get(), [handoff[1] - 10, handoff[1] + 10], [6, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.bar, { paddingTop: insets.top, height: insets.top + COMPACT_BAR_HEIGHT }]}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, bgStyle]}>
        <GlassView style={StyleSheet.absoluteFill} intensity={60} />
        {divider ? <View className="absolute bottom-0 left-0 right-0 h-px bg-border" /> : null}
      </Animated.View>
      <View pointerEvents="box-none" className="flex-1 flex-row items-center justify-between px-5">
        {/* Equal flexible sides keep the title centred whatever sits on the right. */}
        <View className="flex-1" />
        <Animated.View style={titleStyle}>
          <Text className="text-[16px] font-semibold">{title}</Text>
        </Animated.View>
        <View pointerEvents="box-none" className="flex-1 flex-row items-center justify-end gap-2">
          {right}
        </View>
      </View>
    </View>
  );
}

/** Big title at the top of the scroll content. Gently scales on overscroll. */
export function LargeTitle({
  title,
  subtitle,
  scrollY,
  accessory,
}: {
  title: string;
  subtitle?: ReactNode;
  scrollY: SharedValue<number>;
  accessory?: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  const style = useAnimatedStyle(() => {
    const y = scrollY.get();
    return {
      opacity: interpolate(y, HANDOFF, [1, 0], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(y, [-120, 0], [1.08, 1], Extrapolation.CLAMP) },
        { translateY: interpolate(y, [0, HANDOFF[1]], [0, 8], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <View style={{ paddingTop: insets.top + COMPACT_BAR_HEIGHT - 4 }} className="px-5 pb-4">
      <View className="flex-row items-end justify-between">
        <Animated.View style={[{ transformOrigin: "left bottom" }, style]} className="flex-1 pr-3">
          <Text className="text-[34px] font-bold tracking-tight">{title}</Text>
          {subtitle ? (
            typeof subtitle === "string" ? (
              <Text className="mt-1 text-[15px] text-text-secondary">{subtitle}</Text>
            ) : (
              subtitle
            )
          ) : null}
        </Animated.View>
        {accessory}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
