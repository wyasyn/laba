import { duration, haptic } from "@/lib/motion";
import { useTheme } from "@/lib/useTheme";
import { useEffect } from "react";
import { Pressable, ScrollView } from "react-native";
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
}

export function FilterChips({ options, selected, onSelect, allLabel = "All" }: FilterChipsProps) {
  if (options.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      keyboardShouldPersistTaps="handled"
    >
      <Chip label={allLabel} active={selected === null} onPress={() => onSelect(null)} />
      {options.map((opt) => (
        <Chip
          key={opt}
          label={opt}
          active={selected === opt}
          onPress={() => onSelect(selected === opt ? null : opt)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.set(withTiming(active ? 1 : 0, { duration: duration.base }));
  }, [active, progress]);

  const chipStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], [colors.surface, colors.textPrimary]),
    borderColor: interpolateColor(progress.get(), [0, 1], [colors.border, colors.textPrimary]),
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.get(), [0, 1], [colors.textSecondary, colors.background]),
  }));

  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Animated.View style={chipStyle} className="h-9 justify-center rounded-full border px-4">
        <Animated.Text style={textStyle} className="font-sans text-[13px] font-semibold capitalize">
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}
