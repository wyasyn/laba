import { useT } from "@/lib/i18n";
import { duration, haptic } from "@/lib/motion";
import { useTheme } from "@/lib/useTheme";
import { cn } from "@/lib/utils";
import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { forwardRef, memo, type ReactNode } from "react";
import { Pressable, TextInput, View } from "react-native";
import Animated, {
  ZoomIn,
  ZoomOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Shown after the input; clear still appears when there is text. */
  trailingAccessory?: ReactNode;
  /** Shorter field for use inside a toolbar. */
  compact?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export const SearchBar = memo(
  forwardRef<TextInput, SearchBarProps>(function SearchBar(
    { value, onChangeText, placeholder, trailingAccessory, compact, autoFocus, className },
    ref,
  ) {
    const { colors } = useTheme();
    const { t } = useT();
    const focus = useSharedValue(0);

    const shellStyle = useAnimatedStyle(() => ({
      borderColor: interpolateColor(focus.get(), [0, 1], [colors.border, colors.primary]),
      backgroundColor: interpolateColor(
        focus.get(),
        [0, 1],
        [colors.surface, colors.surfaceElevated],
      ),
      transform: [{ scale: 1 + focus.get() * 0.01 }],
    }));

    return (
      <View className={cn("mx-5 flex-row items-center gap-2", className)}>
        <Animated.View
          style={shellStyle}
          className={cn("flex-1 flex-row items-center border px-4", compact ? "h-10 rounded-xl" : "h-12 rounded-2xl")}
        >
          <HugeiconsIcon icon={Search01Icon} size={19} color={colors.textSecondary} />
          <TextInput
            ref={ref}
            className="ml-2.5 h-full flex-1 font-sans text-[15px] text-foreground"
            // Android adds vertical padding and font padding that clip the text in the compact field.
            style={{ paddingVertical: 0, includeFontPadding: false, textAlignVertical: "center" }}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder ?? t("search.defaultPlaceholder")}
            placeholderTextColor={colors.textTertiary}
            selectionColor={colors.primary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            autoFocus={autoFocus}
            onFocus={() => focus.set(withTiming(1, { duration: duration.fast }))}
            onBlur={() => focus.set(withTiming(0, { duration: duration.base }))}
          />
          {value.length > 0 ? (
            <Animated.View entering={ZoomIn.duration(duration.fast)} exiting={ZoomOut.duration(duration.fast)}>
              <Pressable
                onPress={() => {
                  haptic.select();
                  onChangeText("");
                }}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t("search.clear")}
                className="h-6 w-6 items-center justify-center rounded-full bg-surface-light"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={13} color={colors.textSecondary} />
              </Pressable>
            </Animated.View>
          ) : null}
        </Animated.View>
        {trailingAccessory != null ? <View className="shrink-0">{trailingAccessory}</View> : null}
      </View>
    );
  }),
);
