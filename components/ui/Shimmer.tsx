import { useTheme } from "@/lib/useTheme";
import { withAlpha } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

const ShimmerContext = createContext<SharedValue<number> | null>(null);

/**
 * Drives every Skeleton inside it from one clock so the sweep moves in sync
 * across the whole placeholder layout (and only one animation runs).
 */
export function ShimmerGroup({ children }: { children: ReactNode }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, false),
    );
  }, [progress]);

  return <ShimmerContext.Provider value={progress}>{children}</ShimmerContext.Provider>;
}

interface SkeletonProps {
  className?: string;
  style?: StyleProp<ViewStyle>;
}

/** A placeholder block with a soft light sweep. Must live inside ShimmerGroup. */
export function Skeleton({ className, style }: SkeletonProps) {
  const { colors, resolved } = useTheme();
  const progress = useContext(ShimmerContext);
  const width = useSharedValue(0);

  const sweepStyle = useAnimatedStyle(() => {
    const w = width.get();
    const p = progress ? progress.get() : 0;
    return { transform: [{ translateX: -w + p * w * 2 }] };
  });

  const onLayout = (e: LayoutChangeEvent) => width.set(e.nativeEvent.layout.width);
  const highlight = withAlpha("#FFFFFF", resolved === "dark" ? 0.06 : 0.55);

  return (
    <View
      onLayout={onLayout}
      className={className}
      style={[styles.base, { backgroundColor: colors.surfaceLight }, style]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, sweepStyle]}>
        <LinearGradient
          colors={["transparent", highlight, "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: "hidden" },
});
