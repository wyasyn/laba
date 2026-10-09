import { StationTypeIcon } from "@/components/icons/StationTypeIcon";
import { StationArtwork } from "@/components/StationArtwork";
import { Equalizer } from "@/components/ui/Equalizer";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { useT } from "@/lib/i18n";
import type { Station } from "@/lib/schemas";
import { useTheme } from "@/lib/useTheme";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useRouter } from "expo-router";
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

interface StationCardProps {
  station: Station;
}

export const CARD_RADIUS = 20;
/** Height of the name and meta lines under the artwork. Rows size themselves from this. */
export const CARD_META_HEIGHT = 50;

export function openStation(router: ReturnType<typeof useRouter>, station: Station) {
  usePlayerStore.getState().setPending(station.id);
  router.push({ pathname: "/station/[id]", params: { id: station.id } });
}

function metaLabel(station: Station, kind: string) {
  const category = station.categories[0];
  return category ? `${kind} · ${category.charAt(0).toUpperCase()}${category.slice(1)}` : kind;
}

export const StationCard = memo(function StationCard({ station }: StationCardProps) {
  const router = useRouter();
  const { colors } = useTheme();
  // Card is memoised; subscribing here re-renders it when the language changes.
  const { t } = useT();
  const isOnAir = usePlayerStore(
    (s) => s.currentStation?.id === station.id && s.status === "playing",
  );

  return (
    <PressableScale
      onPress={() => openStation(router, station)}
      accessibilityRole="button"
      accessibilityLabel={t(station.type === "tv" ? "card.playTv" : "card.playRadio", { name: station.name })}
      scaleTo={0.965}
    >
      <View style={[styles.art, { backgroundColor: colors.surfaceLight }]}>
        <StationArtwork station={station} variant="tile" />

        <View style={StyleSheet.absoluteFill} className="flex-row items-start p-2">
          {isOnAir ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              className="h-7 flex-row items-center gap-1.5 rounded-full px-2.5"
              style={{ backgroundColor: colors.primary }}
            >
              <Equalizer size={10} color={colors.onPrimary} />
              <Text className="text-[11px] font-bold text-primary-foreground">{t("card.playing")}</Text>
            </Animated.View>
          ) : null}
        </View>

        {/* On-air ring sits above the artwork so it is never clipped by it. */}
        {isOnAir ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.ring, { borderColor: colors.primary }]}
          />
        ) : null}
      </View>

      <View style={styles.meta}>
        <Text numberOfLines={1} className="text-[15px] font-semibold leading-5 tracking-tight">
          {station.name}
        </Text>
        <View className="mt-1 flex-row items-center gap-1.5">
          <StationTypeIcon type={station.type} size={13} color={colors.textTertiary} strokeWidth={2} />
          <Text numberOfLines={1} className="flex-1 text-[12px] font-medium leading-4 text-text-secondary">
            {metaLabel(station, t(station.type === "tv" ? "card.liveTv" : "card.radio"))}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  art: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: CARD_RADIUS,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  ring: {
    borderRadius: CARD_RADIUS,
    borderCurve: "continuous",
    borderWidth: 2.5,
  },
  meta: {
    height: CARD_META_HEIGHT,
    paddingTop: 9,
    paddingHorizontal: 2,
  },
});
