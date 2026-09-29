import { GlassView } from "@/components/ui/GlassView";
import { haptic, spring } from "@/lib/motion";
import { useTheme } from "@/lib/useTheme";
import { useFavouritesStore } from "@/stores/useFavouritesStore";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

interface FavouriteButtonProps {
  stationId: string;
  size?: number;
  /** "glass" sits on artwork, "surface" on themed backgrounds, "plain" has no chip. */
  variant?: "glass" | "surface" | "plain";
  accessibilityLabel?: string;
}

const HEART =
  "M12 20.5s-7.2-4.4-9.2-8.9C1.4 8.4 3.3 4.7 6.9 4.3c1.9-.2 3.8.7 5.1 2.4 1.3-1.7 3.2-2.6 5.1-2.4 3.6.4 5.5 4.1 4.1 7.3-2 4.5-9.2 8.9-9.2 8.9z";

export function FavouriteButton({
  stationId,
  size = 18,
  variant = "glass",
  accessibilityLabel,
}: FavouriteButtonProps) {
  const { colors } = useTheme();
  const isFavourite = useFavouritesStore((s) => s.ids.includes(stationId));
  const toggle = useFavouritesStore((s) => s.toggle);

  const scale = useSharedValue(1);
  const burst = useSharedValue(0);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const burstStyle = useAnimatedStyle(() => ({
    opacity: burst.get() === 0 ? 0 : 0.6 * (1 - burst.get()),
    transform: [{ scale: 0.6 + burst.get() * 1.4 }],
  }));

  const handlePress = () => {
    const adding = !isFavourite;
    scale.set(withSequence(withSpring(adding ? 1.35 : 0.8, spring.bouncy), withSpring(1, spring.bouncy)));
    if (adding) {
      burst.set(0);
      burst.set(withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }, () => burst.set(0)));
      haptic.success();
    } else {
      haptic.tap();
    }
    toggle(stationId);
  };

  const idleColor = variant === "glass" ? "#FFFFFF" : colors.textSecondary;
  const chip = size + 18;

  const heart = (
    <View style={{ width: chip, height: chip }} className="items-center justify-center">
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: chip,
            height: chip,
            borderRadius: chip / 2,
            borderWidth: 2,
            borderColor: colors.primary,
          },
          burstStyle,
        ]}
      />
      <Animated.View style={heartStyle}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d={HEART}
            fill={isFavourite ? colors.primary : "none"}
            stroke={isFavourite ? colors.primary : idleColor}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: isFavourite }}
      accessibilityLabel={
        accessibilityLabel ?? (isFavourite ? "Remove from favourites" : "Add to favourites")
      }
    >
      {variant === "glass" ? (
        <GlassView dark style={{ borderRadius: chip / 2 }}>
          {heart}
        </GlassView>
      ) : variant === "surface" ? (
        <View className="rounded-full border border-border bg-surface">{heart}</View>
      ) : (
        heart
      )}
    </Pressable>
  );
}
