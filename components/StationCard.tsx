import { FavouriteButton } from "@/components/FavouriteButton";
import { StationArtwork } from "@/components/StationArtwork";
import { LiveDot } from "@/components/ui/LiveDot";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { TypePill } from "@/components/ui/TypePill";
import type { Station } from "@/lib/schemas";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { memo } from "react";
import { StyleSheet, View } from "react-native";

interface StationCardProps {
  station: Station;
  /** Show the favourite toggle on the artwork. */
  showFavourite?: boolean;
  aspectRatio?: number;
}

const RADIUS = 22;
const SCRIM = ["transparent", "rgba(0,0,0,0.25)", "rgba(0,0,0,0.85)"] as const;
const SCRIM_LOCATIONS = [0.35, 0.6, 1] as const;

export function openStation(router: ReturnType<typeof useRouter>, station: Station) {
  usePlayerStore.getState().setPending(station.id);
  router.push({ pathname: "/station/[id]", params: { id: station.id } });
}

export const StationCard = memo(function StationCard({
  station,
  showFavourite = true,
  aspectRatio = 3 / 4,
}: StationCardProps) {
  const router = useRouter();
  const isOnAir = usePlayerStore(
    (s) => s.currentStation?.id === station.id && s.status === "playing",
  );

  return (
    <PressableScale
      onPress={() => openStation(router, station)}
      accessibilityRole="button"
      accessibilityLabel={`Play ${station.name}`}
      scaleTo={0.965}
      style={[styles.card, { aspectRatio }]}
    >
      <StationArtwork station={station} variant="tile" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={SCRIM}
        locations={SCRIM_LOCATIONS}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View className="flex-row items-start justify-between p-2.5">
        {isOnAir ? (
          <View className="flex-row items-center gap-1.5 rounded-full bg-black/55 px-2 py-1">
            <LiveDot size={6} />
            <Text className="text-[10px] font-bold uppercase tracking-widest text-white">
              On air
            </Text>
          </View>
        ) : (
          <View />
        )}
        {showFavourite ? <FavouriteButton stationId={station.id} size={15} /> : null}
      </View>

      <View className="mt-auto gap-1.5 p-3">
        <TypePill type={station.type} variant="solid" />
        <Text numberOfLines={2} className="text-[15px] font-bold leading-[19px] text-white">
          {station.name}
        </Text>
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: RADIUS,
    overflow: "hidden",
    borderCurve: "continuous",
  },
});
