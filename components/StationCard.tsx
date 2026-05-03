import { StationArtwork } from "@/components/StationArtwork";
import type { Station } from "@/lib/schemas";
import { useTheme } from "@/lib/useTheme";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface StationCardProps {
  station: Station;
  size?: "small" | "large";
  /** Poster + title below (home rows). */
  layout?: "overlay" | "stacked";
  /** @deprecated Kept for overlay layout; home rows use `layout="stacked"`. */
  compact?: boolean;
}

const STACKED_RADIUS = 26;
const STACKED_TITLE_ROW_PAD_H = 12;

export const StationCard = memo(function StationCard({
  station,
  size = "small",
  layout = "overlay",
  compact = false,
}: StationCardProps) {
  const router = useRouter();
  const { colors } = useTheme();

  const isLarge = size === "large";
  const isTv = station.type === "tv";
  const badgeColor = isTv ? colors.primary : colors.success;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    usePlayerStore.getState().setPending(station.id);
    router.push({
      pathname: "/station/[id]" as const,
      params: { id: station.id },
    } as never);
  }, [station.id, router]);

  const aspectRatio = isLarge ? 4 / 5 : 3 / 4;
  const titleSize = isLarge ? 15 : 13;

  if (layout === "stacked") {
    return (
      <View style={styles.stackedRoot}>
        <Pressable
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={`Play ${station.name}`}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <View
            style={[
              styles.stackedArtWrap,
              {
                aspectRatio,
                borderRadius: STACKED_RADIUS,
                backgroundColor: colors.background,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              },
            ]}
          >
            <StationArtwork
              station={station}
              variant="tile"
              style={StyleSheet.absoluteFillObject}
            />
          </View>
        </Pressable>
        <Pressable
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={`Play ${station.name}`}
          style={({ pressed }) => [
            styles.stackedTitleWrap,
            {
              paddingHorizontal: STACKED_TITLE_ROW_PAD_H,
              paddingTop: 18,
            },
            pressed && styles.pressed,
          ]}
        >
          <Text
            numberOfLines={2}
            style={[styles.stackedTitle, { fontSize: titleSize, color: colors.textPrimary }]}
          >
            {station.name}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Play ${station.name}`}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <View
        style={[
          styles.cardRoot,
          {
            aspectRatio,
            borderRadius: 12,
            backgroundColor: colors.background,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 3,
            elevation: 2,
          },
        ]}
      >
        <StationArtwork station={station} variant="tile" style={StyleSheet.absoluteFill} />

        <View
          style={[styles.bottomBlock, { backgroundColor: `${colors.background}E8` }]}
          pointerEvents="box-none"
        >
          <Text
            numberOfLines={compact ? 2 : 2}
            style={[
              styles.title,
              { fontSize: titleSize, color: colors.textPrimary, textAlign: "center" },
            ]}
          >
            {station.name}
          </Text>
          {!compact && (
            <View style={styles.metaRow}>
              <View
                className="rounded-md px-1.5 py-0.5"
                style={{ backgroundColor: badgeColor + "44" }}
              >
                <Text
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: badgeColor }}
                >
                  {isTv ? "TV" : "Radio"}
                </Text>
              </View>
              {station.language !== "English" && (
                <Text
                  className="text-[10px]"
                  style={{ color: colors.textSecondary, marginLeft: 6 }}
                >
                  {station.language}
                </Text>
              )}
            </View>
          )}
          {compact && (
            <View
              style={[
                styles.compactPill,
                { backgroundColor: badgeColor + "55", alignSelf: "center" },
              ]}
            >
              <Text style={[styles.compactPillText, { color: badgeColor }]}>
                {isTv ? "TV" : "Radio"}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.88,
  },
  stackedRoot: {
    width: "100%",
  },
  stackedArtWrap: {
    width: "100%",
    overflow: "hidden",
  },
  stackedTitleWrap: {
    alignItems: "center",
  },
  stackedTitle: {
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
    width: "100%",
  },
  cardRoot: {
    width: "100%",
    overflow: "hidden",
  },
  bottomBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 14,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: "center",
  },
  title: {
    fontWeight: "700",
    letterSpacing: 0.2,
    alignSelf: "stretch",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 6,
  },
  compactPill: {
    marginTop: 6,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  compactPillText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
});
