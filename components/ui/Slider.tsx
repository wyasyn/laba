import { useT } from "@/lib/i18n";
import { useTheme } from "@/lib/useTheme";
import { haptic, spring } from "@/lib/motion";
import { useEffect } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

interface SliderProps {
  /** 0 to 1 */
  value: number;
  onChange: (value: number) => void;
  /** Track colour behind the fill. */
  trackColor?: string;
  fillColor?: string;
  thumbColor?: string;
  height?: number;
  accessibilityLabel?: string;
}

const THUMB = 18;

/**
 * Horizontal slider that tracks the finger entirely on the UI thread. The JS
 * callback fires at most once per ~5% step while dragging, and once on release,
 * so the parent never re-renders per frame.
 */
export function Slider({
  value,
  onChange,
  trackColor,
  fillColor,
  thumbColor = "#FFFFFF",
  height = 36,
  accessibilityLabel,
}: SliderProps) {
  const { colors } = useTheme();
  const { t } = useT();
  const width = useSharedValue(0);
  const progress = useSharedValue(value);
  const lastEmitted = useSharedValue(value);
  const active = useSharedValue(0);

  // Follow external changes (e.g. mute button) when not dragging.
  useEffect(() => {
    if (active.get() === 0) progress.set(withSpring(value, spring.snappy));
  }, [value, progress, active]);

  const emit = (v: number) => onChange(v);
  const endHaptic = () => haptic.select();

  const update = (x: number, final: boolean) => {
    "worklet";
    const w = width.get();
    if (w <= 0) return;
    const v = Math.min(1, Math.max(0, x / w));
    progress.set(v);
    if (final || Math.abs(v - lastEmitted.get()) >= 0.05 || v === 0 || v === 1) {
      if (v !== lastEmitted.get() || final) {
        lastEmitted.set(v);
        scheduleOnRN(emit, v);
      }
    }
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      active.set(withSpring(1, spring.snappy));
      update(e.x, false);
    })
    .onUpdate((e) => update(e.x, false))
    .onEnd((e) => {
      update(e.x, true);
      scheduleOnRN(endHaptic);
    })
    .onFinalize(() => {
      active.set(withSpring(0, spring.snappy));
    });

  const fillStyle = useAnimatedStyle(() => ({
    width: progress.get() * width.get(),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.get() * width.get() - THUMB / 2 },
      { scale: 1 + active.get() * 0.25 },
    ],
  }));

  const trackStyle = useAnimatedStyle(() => ({
    height: 5 + active.get() * 3,
  }));

  const onLayout = (e: LayoutChangeEvent) => width.set(e.nativeEvent.layout.width);

  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel ?? t("player.volume")}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => {
          const step = e.nativeEvent.actionName === "increment" ? 0.1 : -0.1;
          onChange(Math.min(1, Math.max(0, value + step)));
        }}
        style={{ height, justifyContent: "center" }}
        className="flex-1"
      >
        <View onLayout={onLayout} style={{ justifyContent: "center" }}>
          <Animated.View
            style={[
              { borderRadius: 999, overflow: "hidden", backgroundColor: trackColor ?? colors.border },
              trackStyle,
            ]}
          >
            <Animated.View
              style={[{ height: "100%", backgroundColor: fillColor ?? colors.primary }, fillStyle]}
            />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                left: 0,
                width: THUMB,
                height: THUMB,
                borderRadius: THUMB / 2,
                backgroundColor: thumbColor,
                shadowColor: "#000",
                shadowOpacity: 0.25,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              },
              thumbStyle,
            ]}
          />
        </View>
      </View>
    </GestureDetector>
  );
}
