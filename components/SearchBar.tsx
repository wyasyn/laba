import { useTheme } from "@/lib/useTheme";
import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { forwardRef, memo, useCallback, type ReactNode } from "react";
import { Pressable, TextInput, View } from "react-native";
import { twMerge } from "tailwind-merge";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Larger corner radius (e.g. home discovery). */
  variant?: "default" | "pill";
  /** Shown after the input (e.g. settings); clear still appears when there is text. */
  trailingAccessory?: ReactNode;
  className?: string;
}

export const SearchBar = memo(
  forwardRef<TextInput, SearchBarProps>(function SearchBar(
    {
      value,
      onChangeText,
      placeholder = "Search stations...",
      variant = "default",
      trailingAccessory,
      className,
    },
    ref,
  ) {
    const { colors } = useTheme();

    const handleClear = useCallback(() => onChangeText(""), [onChangeText]);
    const handleSubmit = useCallback(() => {
      if (ref && typeof ref !== "function" && ref.current) {
        ref.current.blur();
      }
    }, [ref]);

    const shellClass =
      variant === "pill"
        ? "mx-4 mb-3 flex-row items-center rounded-3xl border border-border bg-surface px-4 py-2"
        : "mx-4 mb-4 flex-row items-center rounded-2xl bg-surface px-4 py-1";

    return (
      <View className={twMerge(shellClass, className)}>
        <HugeiconsIcon
          icon={Search01Icon}
          size={20}
          color={colors.textSecondary}
        />
        <TextInput
          ref={ref}
          className="ml-3 flex-1 py-1 text-base text-foreground"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
        />
        {value.length > 0 && (
          <Pressable
            onPress={handleClear}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            className="ml-2 rounded-full p-1"
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
        {trailingAccessory != null ? (
          <View className="ml-1 shrink-0">{trailingAccessory}</View>
        ) : null}
      </View>
    );
  }),
);
