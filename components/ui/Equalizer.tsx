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

interface EqualizerProps {
  color?: string;
  /** Height of the tallest bar. */
  size?: number;
  active?: boolean;
}

const BAR_DURATIONS = [520, 380, 460] as const;

/** Three bouncing bars, the "now playing" mark. */
export function Equalizer({ color = "#FFFFFF", size = 12, active = true }: EqualizerProps) {
  const barWidth = Math.max(2, Math.round(size / 5));
  return (
    <View style={{ height: size, flexDirection: "row", alignItems: "flex-end", gap: barWidth * 0.7 }}>
      {BAR_DURATIONS.map((ms, i) => (
        <Bar key={i} ms={ms} color={color} width={barWidth} height={size} active={active} />
      ))}
    </View>
  );
}

function Bar({
  ms,
  color,
  width,
  height,
  active,
}: {
  ms: number;
  color: string;
  width: number;
  height: number;
  active: boolean;
}) {
  const level = useSharedValue(0.4);

  useEffect(() => {
    if (active) {
      level.set(withRepeat(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.quad) }), -1, true));
    } else {
      cancelAnimation(level);
      level.set(withTiming(0.4, { duration: 200 }));
    }
    return () => cancelAnimation(level);
  }, [active, level, ms]);

  const style = useAnimatedStyle(() => ({
    height: Math.max(width, height * level.get()),
  }));

  return <Animated.View style={[{ width, borderRadius: width, backgroundColor: color }, style]} />;
}
