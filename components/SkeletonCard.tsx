import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

function useSkeletonPulse() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, [opacity]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
}

/** Matches poster-style StationCard (3:4) used in grids. */
export function SkeletonCard() {
  const animatedStyle = useSkeletonPulse();

  return (
    <View
      className="mb-3 overflow-hidden rounded-xl bg-surface"
      style={{ aspectRatio: 3 / 4, width: "100%" }}
    >
      <Animated.View
        className="flex-1 bg-surface-light"
        style={animatedStyle}
      />
      <View className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-8">
        <Animated.View
          className="h-[14px] w-[85%] rounded bg-surface-light"
          style={animatedStyle}
        />
        <Animated.View
          className="mt-2 h-2.5 w-1/3 rounded bg-surface-light"
          style={animatedStyle}
        />
      </View>
    </View>
  );
}

/** Matches stacked `StationCard` used on home horizontal rows. */
export function SkeletonRowCard() {
  const animatedStyle = useSkeletonPulse();

  return (
    <View className="w-44 shrink-0">
      <View
        className="overflow-hidden rounded-[26px] bg-surface"
        style={{ aspectRatio: 3 / 4, width: "100%" }}
      >
        <Animated.View className="flex-1 bg-surface-light" style={animatedStyle} />
      </View>
      <View className="items-center px-3 pt-5">
        <Animated.View
          className="h-[13px] w-[85%] rounded-md bg-surface-light"
          style={animatedStyle}
        />
      </View>
    </View>
  );
}
