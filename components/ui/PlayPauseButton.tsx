import { useT } from "@/lib/i18n";
import { duration, spring } from "@/lib/motion";
import type { PlaybackStatus } from "@/stores/usePlayerStore";
import { PauseIcon, PlayIcon, ReloadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { PressableScale } from "./PressableScale";

interface PlayPauseButtonProps {
  status: PlaybackStatus;
  onPress: () => void;
  size?: number;
  /** Background colour of the round button. */
  background: string;
  /** Icon/spinner colour. */
  color: string;
}

type Face = "play" | "pause" | "loading" | "retry";

function faceFor(status: PlaybackStatus): Face {
  if (status === "loading") return "loading";
  if (status === "playing") return "pause";
  if (status === "error") return "retry";
  return "play";
}

/**
 * Round transport button. Icons cross-fade and scale between states instead
 * of snapping, so play → connecting → pause reads as one continuous control.
 */
export function PlayPauseButton({ status, onPress, size = 72, background, color }: PlayPauseButtonProps) {
  const face = faceFor(status);
  const iconSize = Math.round(size * 0.4);
  const { t } = useT();
  const label =
    face === "pause"
      ? t("player.pause")
      : face === "retry"
        ? t("player.retry")
        : face === "loading"
          ? t("player.connecting")
          : t("player.play");

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      scaleTo={0.9}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FaceLayer visible={face === "play"}>
        <HugeiconsIcon icon={PlayIcon} size={iconSize} color={color} fill={color} />
      </FaceLayer>
      <FaceLayer visible={face === "pause"}>
        <HugeiconsIcon icon={PauseIcon} size={iconSize} color={color} fill={color} />
      </FaceLayer>
      <FaceLayer visible={face === "retry"}>
        <HugeiconsIcon icon={ReloadIcon} size={iconSize} color={color} />
      </FaceLayer>
      <FaceLayer visible={face === "loading"}>
        <ActivityIndicator color={color} size={size > 50 ? "large" : "small"} />
      </FaceLayer>
    </PressableScale>
  );
}

function FaceLayer({ visible, children }: { visible: boolean; children: ReactNode }) {
  const v = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    v.set(visible ? withSpring(1, spring.snappy) : withTiming(0, { duration: duration.fast }));
  }, [visible, v]);

  const style = useAnimatedStyle(() => ({
    opacity: v.get(),
    transform: [{ scale: 0.6 + v.get() * 0.4 }, { rotate: `${(1 - v.get()) * -30}deg` }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center, style]}>
      <View>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
