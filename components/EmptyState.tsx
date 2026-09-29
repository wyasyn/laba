import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { enterFromBelow } from "@/lib/motion";
import { useTheme } from "@/lib/useTheme";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: Parameters<typeof HugeiconsIcon>[0]["icon"];
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = "No stations found",
  message = "Try a different search term",
  icon = Search01Icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const breathe = useSharedValue(0);

  useEffect(() => {
    breathe.set(withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [breathe]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.get() * 0.08 }],
    opacity: 0.5 + breathe.get() * 0.5,
  }));

  return (
    <Animated.View entering={enterFromBelow()} className="flex-1 items-center justify-center px-10 py-20">
      <View className="mb-6 h-24 w-24 items-center justify-center">
        <Animated.View
          style={haloStyle}
          className="absolute h-24 w-24 rounded-full bg-primary/10"
        />
        <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <HugeiconsIcon icon={icon} size={28} color={colors.primary} />
        </View>
      </View>
      <Text className="text-center text-lg font-bold">{title}</Text>
      <Text className="mt-2 text-center text-sm leading-5 text-text-secondary">{message}</Text>
      {actionLabel && onAction ? (
        <PressableScale
          onPress={onAction}
          accessibilityRole="button"
          className="mt-6 rounded-full bg-primary px-6 py-3"
        >
          <Text className="font-semibold text-white">{actionLabel}</Text>
        </PressableScale>
      ) : null}
    </Animated.View>
  );
}
