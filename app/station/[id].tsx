import { AudioPlayer } from "@/components/AudioPlayer";
import { StationCard } from "@/components/StationCard";
import { StationArtwork } from "@/components/StationArtwork";
import { VideoPlayer } from "@/components/VideoPlayer";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { useTheme } from "@/lib/useTheme";
import { useFavouritesStore } from "@/stores/useFavouritesStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useStationStore } from "@/stores/useStationStore";
import { ArrowLeft01Icon, FavouriteIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const station = useStationStore((s) => s.stations.find((st) => st.id === id));
  const isFavourite = useFavouritesStore((s) => s.ids.includes(id));
  const toggle = useFavouritesStore((s) => s.toggle);
  const play = usePlayerStore((s) => s.play);
  const stop = usePlayerStore((s) => s.stop);
  const isRefreshing = useStationStore((s) => s.isRefreshing);
  const refreshStations = useStationStore((s) => s.refreshStations);
  const stations = useStationStore((s) => s.stations);

  // Register station as active immediately on mount; clean up on unmount
  useEffect(() => {
    if (station) play(station);
    return () => stop();
  }, [station, play, stop]);

  if (!station) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-text-secondary">Station not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-primary">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isTv = station.type === "tv";
  const badgeColor = isTv ? colors.primary : colors.success;
  const relatedStations = useMemo(
    () =>
      stations
        .filter((candidate) => {
          if (candidate.id === station.id) return false;
          if (candidate.type !== station.type) return false;
          return candidate.categories.some((cat) => station.categories.includes(cat));
        })
        .slice(0, 10),
    [stations, station],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={isTv ? ["top"] : undefined}>
      {!isTv && (
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            className="rounded-full bg-surface p-2.5"
          >
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              size={22}
              color={colors.textPrimary}
            />
          </Pressable>

          <Pressable
            onPress={() => toggle(id)}
            className="rounded-full bg-surface p-2.5"
          >
            <HugeiconsIcon
              icon={FavouriteIcon}
              size={22}
              color={isFavourite ? colors.primary : colors.textSecondary}
            />
          </Pressable>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshStations}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {!isTv && (
          <View
            className="mx-4 mb-1 overflow-hidden rounded-xl bg-background"
            style={{ aspectRatio: 16 / 9 }}
          >
            <StationArtwork station={station} variant="tile" />
          </View>
        )}

        {isTv ? (
          station.youtubeChannelId ? (
            <YouTubePlayer
              channelId={station.youtubeChannelId}
              borderless
              onBack={() => router.back()}
            />
          ) : (
            <VideoPlayer
              streamUrl={station.streamUrl!}
              borderless
              onBack={() => router.back()}
            />
          )
        ) : (
          <View className="px-4">
            <AudioPlayer station={station} />
          </View>
        )}

        <View className="mt-2 px-4">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="flex-shrink text-2xl font-bold text-foreground">
              {station.name}
            </Text>
            <View
              className="rounded-md px-2 py-0.5"
              style={{ backgroundColor: badgeColor + "33" }}
            >
              <Text
                className="text-[11px] font-bold uppercase tracking-wide"
                style={{ color: badgeColor }}
              >
                {isTv ? "TV" : "Radio"}
              </Text>
            </View>
            {isTv && (
              <Pressable
                onPress={() => toggle(id)}
                className="ml-auto rounded-full bg-surface p-2.5"
              >
                <HugeiconsIcon
                  icon={FavouriteIcon}
                  size={22}
                  color={isFavourite ? colors.primary : colors.textSecondary}
                />
              </Pressable>
            )}
          </View>
          {relatedStations.length > 0 ? (
            <View className="mt-5">
              <Text className="mb-2 text-lg font-semibold text-foreground">
                Related stations
              </Text>
              <FlatList
                data={relatedStations}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
                renderItem={({ item }) => (
                  <View className="w-44 shrink-0">
                    <StationCard station={item} />
                  </View>
                )}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
