import { useTheme } from "@/lib/useTheme";
import { useFavouritesStore } from "@/stores/useFavouritesStore";
import { FavouriteIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as Haptics from "expo-haptics";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

interface FavouriteButtonProps {
  stationId: string;
  size?: number;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FavouriteButton({
  stationId,
  size = 20,
  accessibilityLabel = "Toggle favourite",
}: FavouriteButtonProps) {
  const { colors } = useTheme();
  const isFavourite = useFavouritesStore((s) => s.ids.includes(stationId));
  const toggle = useFavouritesStore((s) => s.toggle);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(1.3, { damping: 4 }),
      withSpring(1, { damping: 6 })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggle(stationId);
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={animatedStyle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <HugeiconsIcon
        icon={FavouriteIcon}
        size={size}
        color={isFavourite ? colors.primary : colors.textSecondary}
      />
    </AnimatedPressable>
  );
}
