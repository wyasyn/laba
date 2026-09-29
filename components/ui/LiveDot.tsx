import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface LiveDotProps {
  color?: string;
  size?: number;
  /** When false the halo stops and the dot sits still. */
  active?: boolean;
}

/** A small dot with a soft expanding halo, used for "live" and "now playing". */
export function LiveDot({ color = "#E50914", size = 8, active = true }: LiveDotProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (active) {
      pulse.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false));
    } else {
      cancelAnimation(pulse);
      pulse.set(0);
    }
    return () => cancelAnimation(pulse);
  }, [active, pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - pulse.get()),
    transform: [{ scale: 1 + pulse.get() * 1.6 }],
  }));

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Animated.View
        style={[
          { position: "absolute", width: size, height: size, borderRadius: size, backgroundColor: color },
          haloStyle,
        ]}
      />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}
