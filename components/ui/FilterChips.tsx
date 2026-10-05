import { duration, haptic, spring } from "@/lib/motion";
import { useTheme } from "@/lib/useTheme";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface FilterChipsProps {
  options: string[];
  /** null means "All". */
  selected: string | null;
  onSelect: (value: string | null) => void;
  allLabel?: string;
  /** Optional count shown after each label, keyed by option ("" for All). */
  counts?: Record<string, number>;
  /** Display labels keyed by option; options are shown as-is otherwise. */
  labels?: Record<string, string>;
  /** Rendered after the rail, e.g. a button for more filters. */
  trailing?: ReactNode;
}

export const FILTER_CHIPS_HEIGHT = 44;
const RAIL_PADDING = 4;
const GUTTER = 20;

type Frame = { x: number; width: number };

/**
 * Segmented rail of categories. The rounded rail keeps the content width and
 * only the tabs scroll inside it. A single indicator slides between tabs, and
 * the selected tab is scrolled towards the middle so the next options show.
 */
export function FilterChips({
  options,
  selected,
  onSelect,
  allLabel = "All",
  counts,
  labels,
  trailing,
}: FilterChipsProps) {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const frames = useRef<Record<string, Frame>>({});
  const [viewport, setViewport] = useState(0);

  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);

  const key = selected ?? "";

  const moveTo = (target: string, animate: boolean) => {
    const frame = frames.current[target];
    if (!frame) return;
    if (animate) {
      indicatorX.set(withSpring(frame.x, spring.gentle));
      indicatorW.set(withSpring(frame.width, spring.gentle));
    } else {
      indicatorX.set(frame.x);
      indicatorW.set(frame.width);
    }
    if (viewport > 0) {
      const centred = frame.x - (viewport - frame.width) / 2;
      scrollRef.current?.scrollTo({ x: Math.max(0, centred), animated: animate });
    }
  };

  useEffect(() => {
    moveTo(key, true);
    // moveTo reads refs only; re-run when the selection or viewport changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, viewport]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: indicatorW.get(),
    transform: [{ translateX: indicatorX.get() }],
    opacity: indicatorW.get() > 0 ? 1 : 0,
  }));

  if (options.length === 0 && !trailing) return null;

  const onChipLayout = (value: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    frames.current[value] = { x, width };
    if (value === key) moveTo(value, false);
  };

  const items: { value: string | null; label: string }[] = [
    { value: null, label: allLabel },
    ...options.map((o) => ({ value: o, label: labels?.[o] ?? o })),
  ];

  const rail = (
    <View
      className="overflow-hidden rounded-full border border-border bg-surface"
      style={
        trailing
          ? { flex: 1, height: FILTER_CHIPS_HEIGHT, padding: RAIL_PADDING }
          : { marginHorizontal: GUTTER, height: FILTER_CHIPS_HEIGHT, padding: RAIL_PADDING }
      }
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // Round the scroll viewport too, so tabs clip against the rail's curve.
        style={{ borderRadius: 999 }}
        onLayout={(e) => setViewport(e.nativeEvent.layout.width)}
      >
        {/* Explicit height: the rail's inner room, less its padding and 1px border. */}
        <View className="flex-row" style={{ height: FILTER_CHIPS_HEIGHT - RAIL_PADDING * 2 - 2 }}>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                borderRadius: 999,
                backgroundColor: colors.primary,
              },
              indicatorStyle,
            ]}
          />
          {items.map(({ value, label }) => (
            <Chip
              key={value ?? ""}
              label={label}
              count={counts?.[value ?? ""]}
              active={selected === value}
              onLayout={onChipLayout(value ?? "")}
              onPress={() => onSelect(value === null || selected === value ? null : value)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );

  if (!trailing) return rail;
  return (
    <View className="flex-row items-center gap-2" style={{ marginHorizontal: GUTTER }}>
      {rail}
      {trailing}
    </View>
  );
}

function Chip({
  label,
  count,
  active,
  onPress,
  onLayout,
}: {
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const { colors } = useTheme();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.set(withTiming(active ? 1 : 0, { duration: duration.base }));
  }, [active, progress]);

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.get(), [0, 1], [colors.textSecondary, colors.onPrimary]),
  }));

  const countStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.get(), [0, 1], [colors.textTertiary, colors.onPrimary]),
    opacity: 0.75 + progress.get() * 0.1,
  }));

  return (
    <Pressable
      onLayout={onLayout}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={count != null ? `${label}, ${count}` : label}
      className="h-full flex-row items-center gap-1.5 rounded-full px-4"
    >
      <Animated.Text style={textStyle} className="font-sans text-[13px] font-semibold capitalize">
        {label}
      </Animated.Text>
      {count != null ? (
        <Animated.Text style={countStyle} className="font-sans text-[11px] font-semibold">
          {count}
        </Animated.Text>
      ) : null}
    </Pressable>
  );
}
