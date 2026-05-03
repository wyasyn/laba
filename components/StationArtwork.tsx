import type { Station } from "@/lib/schemas";
import { useTheme } from "@/lib/useTheme";
import { Image } from "expo-image";
import { memo, useCallback, useEffect, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

export type StationArtworkVariant = "tile" | "hero" | "disc";

interface StationArtworkProps {
  station: Station;
  variant: StationArtworkVariant;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_TV = require("@/assets/images/tv.jpg");
const DEFAULT_RADIO = require("@/assets/images/radio.jpg");

export const StationArtwork = memo(function StationArtwork(
  props: StationArtworkProps,
) {
  const { station, style } = props;
  const { colors } = useTheme();
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [station.id, station.logo]);

  const showRemote = Boolean(station.logo) && !logoFailed;
  const onError = useCallback(() => setLogoFailed(true), []);

  const isTv = station.type === "tv";
  const fallbackSource = isTv ? DEFAULT_TV : DEFAULT_RADIO;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }, style]}>
      {showRemote ? (
        <Image
          source={{ uri: station.logo }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
          onError={onError}
        />
      ) : (
        <Image
          source={fallbackSource}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
        />
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
});
