import { useT } from "@/lib/i18n";
import { duration, haptic } from "@/lib/motion";
import { useTheme } from "@/lib/useTheme";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
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
/** Height of one pill, and of the filter button that sits beside the row. */
export const CHIP_HEIGHT = 36;
const GUTTER = 20;

type Frame = { x: number; width: number };

/**
 * Category pills on one row that scrolls sideways (never wraps), styled like the desktop
 * app's: bordered pills, the selected one filled. The selected pill is scrolled towards
 * the middle so the next options show.
 */
export function FilterChips({
  options,
  selected,
  onSelect,
  allLabel,
  counts,
  labels,
  trailing,
}: FilterChipsProps) {
  const { t } = useT();
  const scrollRef = useRef<ScrollView>(null);
  const frames = useRef<Record<string, Frame>>({});
  const [viewport, setViewport] = useState(0);

  const key = selected ?? "";

  const centre = (target: string, animate: boolean) => {
    const frame = frames.current[target];
    if (!frame || viewport === 0) return;
    const centred = frame.x - (viewport - frame.width) / 2;
    scrollRef.current?.scrollTo({ x: Math.max(0, centred), animated: animate });
  };

  useEffect(() => {
    centre(key, true);
    // centre reads refs only; re-run when the selection or viewport changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, viewport]);

  if (options.length === 0 && !trailing) return null;

  const onChipLayout = (value: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    frames.current[value] = { x, width };
    if (value === key) centre(value, false);
  };

  const items: { value: string | null; label: string }[] = [
    { value: null, label: allLabel ?? t("filters.all") },
    ...options.map((o) => ({ value: o, label: labels?.[o] ?? o })),
  ];

  const rail = (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={{ flexGrow: trailing ? 1 : 0, flexShrink: 1, height: FILTER_CHIPS_HEIGHT }}
      contentContainerStyle={{
        alignItems: "center",
        gap: 8,
        paddingHorizontal: trailing ? 0 : GUTTER,
      }}
      onLayout={(e) => setViewport(e.nativeEvent.layout.width)}
    >
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
    </ScrollView>
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

  const chipStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], [colors.surface, colors.primary]),
    borderColor: interpolateColor(progress.get(), [0, 1], [colors.border, colors.primary]),
  }));

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
    >
      <Animated.View
        style={[chipStyle, { height: CHIP_HEIGHT, borderWidth: 1 }]}
        className="flex-row items-center gap-1.5 rounded-full px-4"
      >
        <Animated.Text style={textStyle} className="font-sans text-[13px] font-semibold capitalize">
          {label}
        </Animated.Text>
        {count != null ? (
          <Animated.Text style={countStyle} className="font-sans text-[11px] font-semibold">
            {count}
          </Animated.Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
