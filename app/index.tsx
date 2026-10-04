import { StationArtwork } from "@/components/StationArtwork";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { duration, easing, haptic } from "@/lib/motion";
import type { Station } from "@/lib/schemas";
import { useTheme } from "@/lib/useTheme";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { useStationStore } from "@/stores/useStationStore";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect } from "expo-router";
import { useEffect, useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLUMNS = 3;
const TILE_GAP = 10;

/**
 * First-launch welcome. Returning users are redirected straight to the tabs;
 * the onboarding flag is resolved before the splash hides, so there is no flash.
 */
export default function RootIndex() {
  const completed = useOnboardingStore((s) => s.completed);
  if (completed) return <Redirect href="/(tabs)" />;
  return <Onboarding />;
}

function Onboarding() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const complete = useOnboardingStore((s) => s.complete);
  const stations = useStationStore((s) => s.stations);

  const tiles = useMemo(() => {
    const withLogo = stations.filter((s) => s.logo);
    const pool = withLogo.length >= 6 ? withLogo : stations;
    return pool.slice(0, 18);
  }, [stations]);

  const onGetStarted = () => {
    haptic.success();
    // Flipping the flag re-renders RootIndex into a <Redirect> to the tabs.
    complete();
  };

  const enter = (i: number) =>
    FadeInDown.duration(duration.slow + 120)
      .delay(250 + i * 110)
      .easing(easing.standard);

  return (
    <View className="flex-1 bg-background">
      <Collage stations={tiles} />
      <LinearGradient
        colors={[`${colors.background}00`, `${colors.background}B3`, colors.background, colors.background]}
        locations={[0, 0.35, 0.62, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={{ paddingBottom: insets.bottom + 24 }} className="flex-1 justify-end px-6">
        <Animated.View entering={enter(0)} className="mb-4 flex-row items-center gap-2 self-start rounded-full bg-primary/15 px-3 py-1.5">
          <View className="h-1.5 w-1.5 rounded-full bg-primary" />
          <Text className="text-xs font-bold uppercase tracking-widest text-primary">Live TV & Radio</Text>
        </Animated.View>
        <Animated.View entering={enter(1)}>
          <Text className="text-[40px] font-bold leading-[44px] tracking-tight">
            Everything live.{"\n"}All in one place.
          </Text>
        </Animated.View>
        <Animated.View entering={enter(2)}>
          <Text className="mt-4 text-base leading-6 text-text-secondary">
            Stream Uganda&apos;s favourite TV channels and radio stations, plus international news, free.
          </Text>
        </Animated.View>
        <Animated.View entering={enter(3)} className="mt-10">
          <PressableScale
            onPress={onGetStarted}
            haptics={false}
            accessibilityRole="button"
            accessibilityLabel="Get started"
            className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary"
            style={styles.ctaShadow}
          >
            <Text className="text-base font-semibold text-primary-foreground">Get started</Text>
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} color={colors.onPrimary} />
          </PressableScale>
        </Animated.View>
      </View>
    </View>
  );
}

function Collage({ stations }: { stations: Station[] }) {
  const { width } = useWindowDimensions();
  const tile = (width - TILE_GAP * (COLUMNS + 1)) / COLUMNS;

  const columns = useMemo(() => {
    const cols: Station[][] = Array.from({ length: COLUMNS }, () => []);
    stations.forEach((s, i) => cols[i % COLUMNS].push(s));
    return cols;
  }, [stations]);

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { flexDirection: "row", gap: TILE_GAP, paddingHorizontal: TILE_GAP, transform: [{ rotate: "-8deg" }, { scale: 1.25 }] }]}
    >
      {columns.map((col, i) => (
        <DriftColumn key={i} stations={col} tile={tile} reverse={i % 2 === 1} />
      ))}
    </View>
  );
}

/** A column of tiles that slowly drifts up (or down), looping forever. */
function DriftColumn({ stations, tile, reverse }: { stations: Station[]; tile: number; reverse: boolean }) {
  const drift = useSharedValue(0);
  const span = (tile * 1.25 + TILE_GAP) * Math.max(stations.length, 1);

  useEffect(() => {
    drift.set(withRepeat(withTiming(1, { duration: 28000, easing: Easing.linear }), -1, false));
  }, [drift]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: (reverse ? drift.get() - 1 : -drift.get()) * span }],
  }));

  // Render the list twice so the loop seam is never visible.
  const doubled = [...stations, ...stations];

  return (
    <Animated.View style={[{ width: tile, gap: TILE_GAP }, style]}>
      {doubled.map((s, i) => (
        <View
          key={`${s.id}-${i}`}
          style={{ width: tile, height: tile * 1.25, borderRadius: 20, overflow: "hidden", opacity: 0.9 }}
        >
          <StationArtwork station={s} variant="tile" />
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ctaShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
