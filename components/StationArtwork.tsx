import { StationTypeIcon } from "@/components/icons/StationTypeIcon";
import type { Station } from "@/lib/schemas";
import { Image, type ImageProps } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
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

/** Curated gradient pairs. Each station gets a stable one, picked from its id. */
const PALETTES = [
  ["#6366F1", "#312E81"],
  ["#8B5CF6", "#4C1D95"],
  ["#EC4899", "#831843"],
  ["#F43F5E", "#7F1D1D"],
  ["#F97316", "#9A3412"],
  ["#F59E0B", "#B45309"],
  ["#10B981", "#065F46"],
  ["#14B8A6", "#134E4A"],
  ["#0EA5E9", "#1E3A8A"],
  ["#64748B", "#1E293B"],
] as const;

/** Words that say nothing about which station this is. */
const GENERIC_WORDS = new Set(["tv", "fm", "am", "radio", "uganda", "the", "channel", "station", "online", "live"]);

/** Below this size the logo fills the tile instead of sitting on a plate. */
const PLATE_MIN_SIZE = 64;

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function stationPalette(station: Station) {
  return PALETTES[hash(station.id) % PALETTES.length];
}

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

export const StationArtwork = memo(function StationArtwork({
  station,
  variant,
  style,
  blurRadius,
  transition = 220,
}: StationArtworkProps) {
  // Remember which logo URL failed rather than a boolean, so a recycled list
  // cell showing a different station never inherits the failure.
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const [size, setSize] = useState(0);

  const showLogo = Boolean(station.logo) && failedLogo !== station.logo;
  const [from, to] = stationPalette(station);
  const onError = showLogo ? () => setFailedLogo(station.logo ?? null) : undefined;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const next = Math.round(Math.min(width, height));
    if (next !== size) setSize(next);
  };

  // Ambient backdrops only need the colour: the station's gradient plus its
  // logo stretched and blurred.
  if (blurRadius != null) {
    return (
      <View style={[styles.fill, style]}>
        <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
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

  const small = size > 0 && size < PLATE_MIN_SIZE;
  const plate = Math.round(size * (variant === "hero" ? 0.36 : 0.54));
  const monogram = stationMonogram(station.name);
  const monoSize = size * (monogram.length === 1 ? 0.46 : monogram.length === 2 ? 0.36 : 0.26);

  return (
    <View style={[styles.fill, style]} onLayout={onLayout}>
      <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* Soft light from the top-left corner gives the flat gradient some depth. */}
      <LinearGradient
        colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />

      {size === 0 ? null : showLogo && small ? (
        <View style={[StyleSheet.absoluteFill, styles.smallPlate]}>
          <Image
            source={{ uri: station.logo }}
            recyclingKey={station.id}
            style={styles.smallLogo}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={transition}
            onError={onError}
          />
        </View>
      ) : (
        <>
          {!small ? (
            <View
              pointerEvents="none"
              style={[styles.watermark, { right: -size * 0.12, bottom: -size * 0.1 }]}
            >
              <StationTypeIcon type={station.type} size={size * 0.62} color="rgba(255,255,255,0.13)" filled />
            </View>
          ) : null}

          <View style={[StyleSheet.absoluteFill, styles.center, variant === "hero" && styles.heroCenter]}>
            {showLogo ? (
              <View
                style={[
                  styles.plate,
                  { width: plate, height: plate, borderRadius: plate * 0.26, padding: plate * 0.14 },
                ]}
              >
                <Image
                  source={{ uri: station.logo }}
                  recyclingKey={station.id}
                  style={styles.plateLogo}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  transition={transition}
                  onError={onError}
                />
              </View>
            ) : (
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                style={[styles.monogram, { fontSize: monoSize, letterSpacing: -monoSize * 0.04 }]}
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
  plate: {
    backgroundColor: "#FFFFFF",
    borderCurve: "continuous",
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  plateLogo: {
    width: "100%",
    height: "100%",
  },
  smallPlate: {
    backgroundColor: "#FFFFFF",
    padding: "12%",
  },
  smallLogo: {
    width: "100%",
    height: "100%",
  },
  monogram: {
    color: "#FFFFFF",
    fontFamily: "Inter",
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.18)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});
