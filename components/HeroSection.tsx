import { FavouriteButton } from "@/components/FavouriteButton";
import { StationArtwork } from "@/components/StationArtwork";
import { openStation } from "@/components/StationCard";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { TypePill } from "@/components/ui/TypePill";
import { HERO_MAX_ITEMS } from "@/lib/selectHeroStations";
import type { Station } from "@/lib/schemas";
import { useTheme } from "@/lib/useTheme";
import { PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

const SIDE = 20;
const GAP = 12;
const PARALLAX = 36;
const SCRIM = ["rgba(0,0,0,0)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.9)"] as const;
const SCRIM_LOCATIONS = [0.25, 0.55, 1] as const;

export function useHeroSize() {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - SIDE * 2, 520);
  return { cardWidth, cardHeight: Math.round(cardWidth * 0.7), stride: cardWidth + GAP };
}

export function HeroSection({ featuredStations }: { featuredStations: Station[] }) {
  const { cardWidth, cardHeight, stride } = useHeroSize();
  const scrollX = useSharedValue(0);

  const items = useMemo(() => featuredStations.slice(0, HERO_MAX_ITEMS), [featuredStations]);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.set(e.contentOffset.x);
  });

  if (items.length === 0) return null;

  return (
    <View className="mb-8">
      <Animated.FlatList
        data={items}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={stride}
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: SIDE, gap: GAP }}
        renderItem={({ item, index }) => (
          <HeroSlide
            station={item}
            index={index}
            scrollX={scrollX}
            width={cardWidth}
            height={cardHeight}
            stride={stride}
          />
        )}
      />
      {items.length > 1 ? (
        <View className="mt-4 flex-row items-center justify-center gap-1.5">
          {items.map((item, i) => (
            <Dot key={item.id} index={i} scrollX={scrollX} stride={stride} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

interface HeroSlideProps {
  station: Station;
  index: number;
  scrollX: SharedValue<number>;
  width: number;
  height: number;
  stride: number;
}

function HeroSlide({ station, index, scrollX, width, height, stride }: HeroSlideProps) {
  const router = useRouter();

  const cardStyle = useAnimatedStyle(() => {
    const d = scrollX.get() / stride - index;
    return {
      transform: [{ scale: interpolate(Math.abs(d), [0, 1], [1, 0.92], Extrapolation.CLAMP) }],
      opacity: interpolate(Math.abs(d), [0, 1], [1, 0.6], Extrapolation.CLAMP),
    };
  });

  // Artwork drifts slower than the card for a parallax depth effect.
  const artStyle = useAnimatedStyle(() => {
    const d = scrollX.get() / stride - index;
    return {
      transform: [{ translateX: interpolate(d, [-1, 0, 1], [-PARALLAX, 0, PARALLAX], Extrapolation.CLAMP) }],
    };
  });

  return (
    <Animated.View style={[{ width, height }, cardStyle]}>
      <PressableScale
        onPress={() => openStation(router, station)}
        accessibilityRole="button"
        accessibilityLabel={`Play ${station.name}`}
        scaleTo={0.98}
        style={[styles.card, { width, height }]}
      >
        <Animated.View
          style={[
            { position: "absolute", top: 0, bottom: 0, left: -PARALLAX, width: width + PARALLAX * 2 },
            artStyle,
          ]}
        >
          <StationArtwork station={station} variant="hero" />
        </Animated.View>
        <LinearGradient
          colors={SCRIM}
          locations={SCRIM_LOCATIONS}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View className="flex-row items-start justify-between p-4">
          <View className="rounded-full bg-black/45 px-2.5 py-1">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-white">
              Featured
            </Text>
          </View>
          <FavouriteButton stationId={station.id} size={17} />
        </View>

        <View className="mt-auto flex-row items-end gap-3 p-4">
          <View className="flex-1 gap-1.5">
            <TypePill type={station.type} variant="solid" />
            <Text numberOfLines={1} className="text-2xl font-bold tracking-tight text-white">
              {station.name}
            </Text>
            {station.description ? (
              <Text numberOfLines={1} className="text-[13px] text-white/75">
                {station.description}
              </Text>
            ) : null}
          </View>
          <PlayChip />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

function PlayChip() {
  const { colors } = useTheme();
  return (
    <View
      className="h-12 w-12 items-center justify-center rounded-full bg-white"
      style={styles.playShadow}
    >
      <HugeiconsIcon icon={PlayIcon} size={20} color={colors.primary} fill={colors.primary} />
    </View>
  );
}

function Dot({ index, scrollX, stride }: { index: number; scrollX: SharedValue<number>; stride: number }) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => {
    const d = Math.abs(scrollX.get() / stride - index);
    return {
      width: interpolate(d, [0, 1], [22, 6], Extrapolation.CLAMP),
      opacity: interpolate(d, [0, 1], [1, 0.35], Extrapolation.CLAMP),
    };
  });
  return (
    <Animated.View
      style={[{ height: 6, borderRadius: 3, backgroundColor: colors.textPrimary }, style]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  playShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
