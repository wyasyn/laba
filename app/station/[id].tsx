import { AudioPlayer } from "@/components/AudioPlayer";
import { StationArtwork } from "@/components/StationArtwork";
import { VideoPlayer } from "@/components/VideoPlayer";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { useTheme } from "@/lib/useTheme";
import { useFavouritesStore } from "@/stores/useFavouritesStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useStationStore } from "@/stores/useStationStore";
import {
  ArrowLeft01Icon,
  FavouriteIcon,
  LinkSquare01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
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

          {station.description ? (
            <Text className="mt-3 text-[15px] leading-6 text-text-secondary">
              {station.description}
            </Text>
          ) : null}

          {station.categories.length > 0 && (
            <View className="mt-4 flex-row flex-wrap gap-2">
              {station.categories.map((cat) => (
                <View
                  key={cat}
                  className="rounded-full border border-border bg-surface px-3 py-1"
                >
                  <Text className="text-[11px] capitalize text-text-secondary">
                    {cat}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View className="mt-6 border-t border-border pt-1">
            <DetailRow label="Language" value={station.language} isLast={false} />
            <DetailRow label="Country" value={station.country} isLast={false} />
            <DetailRow
              label="Type"
              value={station.type === "tv" ? "Television" : "Radio"}
              isLast
            />
          </View>

          {station.website && (
            <Pressable
              onPress={() => WebBrowser.openBrowserAsync(station.website!)}
              className="mt-5 flex-row items-center border-t border-border py-4"
            >
              <HugeiconsIcon
                icon={LinkSquare01Icon}
                size={20}
                color={colors.primary}
              />
              <Text className="ml-3 flex-1 text-[15px] font-medium text-primary">
                Visit website
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-3 ${!isLast ? "border-b border-border" : ""}`}
    >
      <Text className="text-[13px] text-text-secondary">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-[13px] font-medium text-foreground">
        {value}
      </Text>
    </View>
  );
}
