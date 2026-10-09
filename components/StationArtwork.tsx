import { StationTypeIcon } from "@/components/icons/StationTypeIcon";
import type { Station } from "@/lib/schemas";
import { useTheme } from "@/lib/useTheme";
import { Image, type ImageProps } from "expo-image";
import { memo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export type StationArtworkVariant = "tile" | "hero" | "disc";

interface StationArtworkProps {
  station: Station;
  variant: StationArtworkVariant;
  style?: StyleProp<ViewStyle>;
  /** Blur the image (used for ambient backgrounds). */
  blurRadius?: number;
  transition?: ImageProps["transition"];
}

/** Words that say nothing about which station this is. */
const GENERIC_WORDS = new Set(["tv", "fm", "am", "radio", "uganda", "the", "channel", "station", "online", "live"]);

/** Below this size the logo fills the tile with less padding and no watermark. */
const SMALL_MAX_SIZE = 64;

/** "NBS TV" -> "NBS", "Pearl Magic" -> "PM", "Bukedde TV 1" -> "B1". */
export function stationMonogram(name: string) {
  const words = name
    .split(/[\s\-_/]+/)
    .filter((w) => w && !GENERIC_WORDS.has(w.toLowerCase()) && !/\d{2,}|\./.test(w));
  if (words.length === 0) return name.trim().charAt(0).toUpperCase();
  if (/^[A-Z0-9]{2,4}$/.test(words[0])) return words[0];
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}

/**
 * Station artwork on one neutral tile colour (the same for every station): the logo as it
 * is when there is one, else a monogram, with a faint TV or radio mark in the corner.
 */
export const StationArtwork = memo(function StationArtwork({
  station,
  variant,
  style,
  blurRadius,
  transition = 220,
}: StationArtworkProps) {
  const { colors } = useTheme();
  // Remember which logo URL failed rather than a boolean, so a recycled list
  // cell showing a different station never inherits the failure.
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const [size, setSize] = useState(0);

  const showLogo = Boolean(station.logo) && failedLogo !== station.logo;
  const onError = showLogo ? () => setFailedLogo(station.logo ?? null) : undefined;
  const background = { backgroundColor: colors.surfaceLight };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const next = Math.round(Math.min(width, height));
    if (next !== size) setSize(next);
  };

  // Ambient backdrops only need the colour: the logo stretched and blurred.
  if (blurRadius != null) {
    return (
      <View style={[styles.fill, background, style]}>
        {showLogo ? (
          <Image
            source={{ uri: station.logo }}
            recyclingKey={station.id}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={transition}
            blurRadius={blurRadius}
            onError={onError}
          />
        ) : null}
      </View>
    );
  }

  const small = size > 0 && size < SMALL_MAX_SIZE;
  // The logo's box: most of a small tile, a comfortable share of a big one.
  const logoBox = Math.round(size * (small ? 0.8 : variant === "hero" ? 0.42 : 0.62));
  const monogram = stationMonogram(station.name);
  const monoSize = size * (monogram.length === 1 ? 0.46 : monogram.length === 2 ? 0.36 : 0.26);

  return (
    <View style={[styles.fill, background, style]} onLayout={onLayout}>
      {size === 0 ? null : (
        <>
          {!small ? (
            <View
              pointerEvents="none"
              style={[styles.watermark, { right: -size * 0.12, bottom: -size * 0.1 }]}
            >
              <StationTypeIcon
                type={station.type}
                size={size * 0.62}
                color={`${colors.textPrimary}14`}
                filled
              />
            </View>
          ) : null}

          <View style={[StyleSheet.absoluteFill, styles.center, variant === "hero" && styles.heroCenter]}>
            {showLogo ? (
              <Image
                source={{ uri: station.logo }}
                recyclingKey={station.id}
                style={{ width: logoBox, height: logoBox }}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={transition}
                onError={onError}
              />
            ) : (
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                style={[
                  styles.monogram,
                  { color: colors.textSecondary, fontSize: monoSize, letterSpacing: -monoSize * 0.04 },
                ]}
              >
                {monogram}
              </Text>
            )}
          </View>
        </>
      )}
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
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Lift the mark above the hero's bottom text block.
  heroCenter: {
    paddingBottom: "22%",
  },
  watermark: {
    position: "absolute",
    transform: [{ rotate: "-12deg" }],
  },
  monogram: {
    fontFamily: "Inter",
    fontWeight: "700",
  },
});
