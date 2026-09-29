import { AudioPlayer } from "@/components/AudioPlayer";
import { CategoryRow } from "@/components/CategoryRow";
import { EmptyState } from "@/components/EmptyState";
import { FavouriteButton } from "@/components/FavouriteButton";
import { StationArtwork } from "@/components/StationArtwork";
import { VideoPlayer } from "@/components/VideoPlayer";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { IconButton } from "@/components/ui/IconButton";
import { Text } from "@/components/ui/Text";
import { TypePill } from "@/components/ui/TypePill";
import { enterFromBelow } from "@/lib/motion";
import type { Station } from "@/lib/schemas";
import { useTheme } from "@/lib/useTheme";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useStationStore } from "@/stores/useStationStore";
import { ArrowDown01Icon, SignalFull02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function useRelated(station: Station | undefined) {
  const pool = useStationStore((s) =>
    station?.type === "tv" ? s.tvStations : s.radioStations,
  );
  return useMemo(() => {
    if (!station) return [];
    return pool
      .filter(
        (c) => c.id !== station.id && c.categories.some((cat) => station.categories.includes(cat)),
      )
      .slice(0, 10);
  }, [pool, station]);
}

export default function StationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const station = useStationStore((s) => s.stations.find((st) => st.id === id));
  const related = useRelated(station);

  const isTv = station?.type === "tv";

  useEffect(() => {
    if (!station) return;
    const player = usePlayerStore.getState();
    if (station.type === "radio") {
      // Radio lives in the global engine and keeps playing after this screen closes.
      player.play(station);
    } else if (player.currentStation) {
      // Video has the floor: pause the radio so they don't talk over each other.
      player.stop();
    }
  }, [station]);

  if (!station) {
    return (
      <View className="flex-1 bg-background">
        <EmptyState
          title="Station not found"
          message="It may have been removed from the catalogue."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return isTv ? (
    <TvStation station={station} related={related} onBack={() => router.back()} />
  ) : (
    <RadioStation station={station} related={related} onBack={() => router.back()} />
  );
}

interface StationViewProps {
  station: Station;
  related: Station[];
  onBack: () => void;
}

function RadioStation({ station, related, onBack }: StationViewProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      {/* Ambient backdrop: the station's own artwork, heavily blurred. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <StationArtwork
          station={station}
          variant="hero"
          blurRadius={60}
          transition={400}
          style={{ opacity: 0.6, transform: [{ scale: 1.4 }] }}
        />
        <LinearGradient
          colors={[`${colors.background}66`, `${colors.background}CC`, colors.background]}
          locations={[0, 0.45, 0.8]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={{ paddingTop: insets.top + 4 }} className="flex-row items-center justify-between px-4 pb-2">
        <IconButton icon={ArrowDown01Icon} onPress={onBack} accessibilityLabel="Close player" iconSize={22} />
        <View className="items-center">
          <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-text-secondary">
            Now playing
          </Text>
          <Text className="text-[13px] font-semibold">Live radio</Text>
        </View>
        <FavouriteButton stationId={station.id} variant="surface" size={20} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 32 }}
      >
        <Animated.View entering={enterFromBelow(0)}>
          <AudioPlayer station={station} />
        </Animated.View>

        {related.length > 0 ? (
          <View className="mt-12">
            <CategoryRow index={1} title="More like this" stations={related} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function TvStation({ station, related, onBack }: StationViewProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top }} className="bg-black">
        {station.youtubeChannelId ? (
          <YouTubePlayer channelId={station.youtubeChannelId} borderless onBack={onBack} />
        ) : (
          <VideoPlayer streamUrl={station.streamUrl!} borderless onBack={onBack} />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <Animated.View entering={enterFromBelow(0)} className="px-5 pt-5">
          <View className="flex-row items-start gap-3">
            <View className="h-14 w-14 overflow-hidden rounded-2xl border border-border">
              <StationArtwork station={station} variant="tile" />
            </View>
            <View className="flex-1">
              <Text numberOfLines={2} className="text-[22px] font-bold leading-7 tracking-tight">
                {station.name}
              </Text>
              <View className="mt-1.5 flex-row items-center gap-2">
                <TypePill type="tv" />
                <View className="flex-row items-center gap-1">
                  <HugeiconsIcon icon={SignalFull02Icon} size={12} color={colors.success} />
                  <Text className="text-xs font-medium text-text-secondary">
                    {station.country === "UG" ? "Uganda" : station.country} · {station.language}
                  </Text>
                </View>
              </View>
            </View>
            <FavouriteButton stationId={station.id} variant="surface" size={20} />
          </View>

          {station.description ? (
            <Text className="mt-5 text-[15px] leading-[22px] text-text-secondary">
              {station.description}
            </Text>
          ) : null}

          {station.categories.length > 0 ? (
            <View className="mt-4 flex-row flex-wrap gap-2">
              {station.categories.map((c) => (
                <View key={c} className="rounded-full border border-border bg-surface px-3 py-1.5">
                  <Text className="text-xs font-medium capitalize text-text-secondary">{c}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </Animated.View>

        {related.length > 0 ? (
          <View className="mt-10">
            <CategoryRow index={1} title="More like this" stations={related} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
