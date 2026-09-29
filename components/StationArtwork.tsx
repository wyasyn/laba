import type { Station } from "@/lib/schemas";
import { useTheme } from "@/lib/useTheme";
import { Image, type ImageProps } from "expo-image";
import { memo, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

export type StationArtworkVariant = "tile" | "hero" | "disc";

interface StationArtworkProps {
  station: Station;
  variant: StationArtworkVariant;
  style?: StyleProp<ViewStyle>;
  /** Blur the image (used for ambient backgrounds). */
  blurRadius?: number;
  transition?: ImageProps["transition"];
}

const DEFAULT_TV = require("@/assets/images/tv.jpg");
const DEFAULT_RADIO = require("@/assets/images/radio.jpg");

export const StationArtwork = memo(function StationArtwork({
  station,
  style,
  blurRadius,
  transition = 220,
}: StationArtworkProps) {
  const { colors } = useTheme();
  // Remember which logo URL failed rather than a boolean, so a recycled list
  // cell showing a different station never inherits the failure.
  const [failedLogo, setFailedLogo] = useState<string | null>(null);

  const showRemote = Boolean(station.logo) && failedLogo !== station.logo;
  const fallbackSource = station.type === "tv" ? DEFAULT_TV : DEFAULT_RADIO;

  return (
    <View style={[styles.fill, { backgroundColor: colors.surfaceLight }, style]}>
      <Image
        source={showRemote ? { uri: station.logo } : fallbackSource}
        recyclingKey={station.id}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={transition}
        blurRadius={blurRadius}
        onError={showRemote ? () => setFailedLogo(station.logo ?? null) : undefined}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
});
