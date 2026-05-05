import { StationArtwork } from "@/components/StationArtwork";
import type { Station } from "@/lib/schemas";
import { useTheme } from "@/lib/useTheme";
import { usePlayerStore } from "@/stores/usePlayerStore";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface StationCardProps {
  station: Station;
  size?: "small" | "large";
}

const STACKED_RADIUS = 26;
const STACKED_TITLE_ROW_PAD_H = 12;

export const StationCard = memo(function StationCard({
  station,
  size = "small",
}: StationCardProps) {
  const router = useRouter();
  const { colors } = useTheme();

  const isLarge = size === "large";
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
  
    letterSpacing: 0.2,
    textAlign: "center",
    width: "100%",
    marginTop: 10,
  },
});
