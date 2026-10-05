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
import { useT } from "@/lib/i18n";
import { enterFromBelow } from "@/lib/motion";
import { reportStation } from "@/lib/report";
import type { Station } from "@/lib/schemas";
import { countryName, languageName, languagesOf } from "@/lib/search";
import { shareStation } from "@/lib/share";
import { SKIP_MS } from "@/lib/taste";
import { logStreamFailure } from "@/lib/telemetry";
import { useTheme } from "@/lib/useTheme";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useRecentsStore } from "@/stores/useRecentsStore";
import { useStationStore } from "@/stores/useStationStore";
import { useTasteStore } from "@/stores/useTasteStore";
import { ArrowDown01Icon, Share08Icon, SignalFull02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
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
  // A deep link can land before the catalogue is in, or before the background
  // refresh brings in a station the bundled snapshot doesn't have.
  const catalogueSettling = useStationStore(
    (s) => s.stations.length === 0 || s.isLoading || s.isRefreshing,
  );
  const related = useRelated(station);
  const { colors } = useTheme();
  const { t } = useT();

  const isTv = station?.type === "tv";

  // Runs on focus, not just mount: a screen restored from the back stack (e.g. after
  // opening a related station) must take the global player back to its station.
  useFocusEffect(
    useCallback(() => {
      if (!station) return;
      useRecentsStore.getState().record(station.id);
      useTasteStore.getState().recordOpen(station.id);
      const player = usePlayerStore.getState();
      if (station.type === "radio") {
        // Radio lives in the global engine and keeps playing after this screen closes.
        // Opening the station that is already loaded (e.g. expanding the mini-player)
        // keeps its current play/pause intent instead of restarting it.
        const alreadyLoaded =
          player.currentStation?.id === station.id && player.status !== "error";
        if (alreadyLoaded) player.clearPending();
        else player.play(station);
      } else if (player.currentStation) {
        // Video has the floor: pause the radio so they don't talk over each other.
        player.stop();
      }
      if (station.type !== "tv") return;
      // Video only plays while this screen is up, so the visit is the watch time.
      const openedAt = Date.now();
      return () => {
        const watchedMs = Date.now() - openedAt;
        const taste = useTasteStore.getState();
        taste.recordListen(station.id, watchedMs);
        if (watchedMs < SKIP_MS) taste.recordSkip(station.id);
      };
    }, [station]),
  );

  if (!station && catalogueSettling) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }

  if (!station) {
    return (
      <View className="flex-1 bg-background">
        <EmptyState
          title={t("station.notFoundTitle")}
          message={t("station.notFoundMessage")}
          actionLabel={t("common.goBack")}
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
  const { t } = useT();
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
        <IconButton icon={ArrowDown01Icon} onPress={onBack} accessibilityLabel={t("station.close")} iconSize={22} />
        {/* Centred on the screen, not between the uneven side buttons. */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: insets.top + 4 }]} className="items-center justify-center pb-2">
          <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-text-secondary">
            {t("station.nowPlaying")}
          </Text>
          <Text className="text-[13px] font-semibold">{t("station.liveRadio")}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <IconButton
            icon={Share08Icon}
            onPress={() => void shareStation(station)}
            accessibilityLabel={t("station.share", { name: station.name })}
            iconSize={19}
          />
          <FavouriteButton stationId={station.id} variant="surface" size={20} />
        </View>
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
            <CategoryRow index={1} title={t("station.moreLikeThis")} stations={related} />
          </View>
        ) : null}

        <ReportLink station={station} />
      </ScrollView>
    </View>
  );
}

/** Quiet footer link for streams that play badly without erroring outright. */
function ReportLink({ station }: { station: Station }) {
  const { t } = useT();
  return (
    <Pressable
      onPress={() => void reportStation(station)}
      accessibilityRole="button"
      hitSlop={8}
      className="mt-10 self-center px-4 py-2 active:opacity-60"
    >
      <Text className="text-[13px] text-text-tertiary">
        {t("station.reportPrompt")}{" "}
        <Text className="text-[13px] font-semibold text-text-secondary">{t("station.report")}</Text>
      </Text>
    </Pressable>
  );
}

function TvStation({ station, related, onBack }: StationViewProps) {
  const { colors } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top }} className="bg-black">
        {station.youtubeChannelId ? (
          <YouTubePlayer channelId={station.youtubeChannelId} borderless onBack={onBack} />
        ) : (
          <VideoPlayer
            streamUrl={station.streamUrl!}
            title={station.name}
            artworkUrl={station.logo}
            onReport={(error) => void reportStation(station, error)}
            onError={(error) => logStreamFailure(station, error)}
            borderless
            onBack={onBack}
          />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <Animated.View
          entering={enterFromBelow(0)}
          className="px-5 pt-5"
          style={{ width: "100%", maxWidth: 760, alignSelf: "center" }}
        >
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
                    {countryName(station.country)} · {languageName(languagesOf(station)[0] ?? station.language)}
                  </Text>
                </View>
              </View>
            </View>
            <IconButton
              icon={Share08Icon}
              onPress={() => void shareStation(station)}
              accessibilityLabel={t("station.share", { name: station.name })}
              iconSize={19}
            />
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
            <CategoryRow index={1} title={t("station.moreLikeThis")} stations={related} />
          </View>
        ) : null}

        <ReportLink station={station} />
      </ScrollView>
    </View>
  );
}
