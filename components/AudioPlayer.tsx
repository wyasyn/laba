import { SleepTimerButton } from "@/components/SleepTimerButton";
import { StationArtwork } from "@/components/StationArtwork";
import { IconButton } from "@/components/ui/IconButton";
import { LiveDot } from "@/components/ui/LiveDot";
import { PlayPauseButton } from "@/components/ui/PlayPauseButton";
import { Slider } from "@/components/ui/Slider";
import { Text } from "@/components/ui/Text";
import { useT } from "@/lib/i18n";
import { duration, spring } from "@/lib/motion";
import { reportStation } from "@/lib/report";
import type { Station } from "@/lib/schemas";
import { useTheme } from "@/lib/useTheme";
import { useNetworkStore } from "@/stores/useNetworkStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import {
  StopIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMuteIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useEffect } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

const BAR_COUNT = 32;
// Deterministic per-bar variation so the waveform looks organic but stable.
const BARS = Array.from({ length: BAR_COUNT }, (_, i) => ({
  seed: ((i * 37) % 100) / 100,
  freq: 1 + (i % 3),
  amp: 0.55 + (((i * 53) % 45) / 100),
}));

/**
 * Full-size radio controls. Playback itself lives in AudioEngine; this view
 * only reads and drives usePlayerStore, so leaving the screen keeps the music on.
 */
export function AudioPlayer({ station }: { station: Station }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const status = usePlayerStore((s) => s.status);
  const reconnecting = usePlayerStore((s) => s.reconnecting);
  const error = usePlayerStore((s) => s.error);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);
  const { t } = useT();
  const volume = usePlayerStore((s) => s.volume);
  const togglePlayback = usePlayerStore((s) => s.togglePlayback);
  const stop = usePlayerStore((s) => s.stop);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);

  const isPlaying = status === "playing";
  const artSize = Math.min(width - 72, 340);

  // Artwork breathes to full size while playing and settles back when paused.
  const artScale = useSharedValue(isPlaying ? 1 : 0.9);
  useEffect(() => {
    artScale.set(withSpring(isPlaying ? 1 : 0.9, spring.gentle));
  }, [isPlaying, artScale]);
  const artStyle = useAnimatedStyle(() => ({
    transform: [{ scale: artScale.get() }],
  }));

  const statusText =
    status === "loading"
      ? reconnecting
        ? t("player.reconnecting")
        : t("player.connecting")
      : status === "playing"
        ? t("player.liveNow")
        : status === "error"
          ? isOnline
            ? t("player.unavailable")
            : t("player.offline")
          : status === "idle"
            ? t("player.stopped")
            : t("player.paused");

  const volumeIcon = volume === 0 ? VolumeMuteIcon : volume < 0.5 ? VolumeLowIcon : VolumeHighIcon;

  return (
    <View className="items-center">
      <Animated.View
        style={[
          styles.artShadow,
          { width: artSize, height: artSize, borderRadius: 32, shadowColor: colors.primary, backgroundColor: colors.surfaceLight },
          artStyle,
        ]}
      >
        <View style={[StyleSheet.absoluteFill, { borderRadius: 32, overflow: "hidden", borderCurve: "continuous" }]}>
          <StationArtwork station={station} variant="disc" />
        </View>
      </Animated.View>

      <View className="mt-8 w-full px-6" style={{ maxWidth: 560 }}>
        <Text numberOfLines={2} className="text-center text-[26px] font-bold tracking-tight">
          {station.name}
        </Text>
        <View className="mt-2 flex-row items-center justify-center gap-2">
          {isPlaying ? <LiveDot color={colors.primary} /> : null}
          <Text
            className={
              isPlaying
                ? "text-sm font-semibold text-primary"
                : status === "error"
                  ? "text-sm font-medium text-error"
                  : "text-sm font-medium text-text-secondary"
            }
          >
            {statusText}
          </Text>
        </View>
        {nowPlaying && isPlaying ? (
          <Animated.View entering={FadeIn.duration(duration.base)} exiting={FadeOut.duration(duration.fast)}>
            <Text
              numberOfLines={2}
              className="mt-2 text-center text-[15px] text-text-secondary"
              accessibilityLabel={t("player.nowPlayingLabel", { title: nowPlaying })}
            >
              {nowPlaying}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      <Waveform active={isPlaying} color={colors.primary} idleColor={colors.border} />

      <View className="mt-2 flex-row items-center gap-8">
        <IconButton
          icon={volumeIcon}
          onPress={toggleMute}
          accessibilityLabel={volume === 0 ? t("player.unmute") : t("player.mute")}
          size={52}
          iconSize={22}
        />
        <PlayPauseButton
          status={status}
          onPress={togglePlayback}
          size={80}
          background={colors.primary}
          color={colors.onPrimary}
        />
        <IconButton
          icon={StopIcon}
          onPress={stop}
          accessibilityLabel={t("player.stop")}
          size={52}
          iconSize={22}
          disabled={status === "idle"}
        />
      </View>

      <View className="mt-8 w-full flex-row items-center gap-3 px-8" style={{ maxWidth: 520 }}>
        <HugeiconsIcon icon={volumeIcon} size={18} color={colors.textSecondary} />
        <Slider value={volume} onChange={setVolume} accessibilityLabel={t("player.volume")} />
      </View>

      <View className="mt-6">
        <SleepTimerButton />
      </View>

      {status === "error" ? (
        <Animated.View
          entering={FadeIn.duration(duration.base)}
          exiting={FadeOut.duration(duration.fast)}
          className="mx-6 mt-6 w-auto rounded-2xl border border-error/30 bg-error/10 px-4 py-3"
        >
          <Text className="text-center text-sm font-medium">{error ?? t("player.errorFallback")}</Text>
          <Text className="mt-1 text-center text-xs text-text-secondary">
            {isOnline
              ? t("player.hintRetry")
              : t("player.hintOffline")}
          </Text>
          {isOnline ? (
            <Pressable
              onPress={() => void reportStation(station, error)}
              accessibilityRole="button"
              hitSlop={8}
              className="mt-2 self-center active:opacity-60"
            >
              <Text className="text-xs font-semibold underline">{t("station.report")}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

function Waveform({ active, color, idleColor }: { active: boolean; color: string; idleColor: string }) {
  // One clock and one energy value drive every bar.
  const clock = useSharedValue(0);
  const energy = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    if (active) {
      clock.set(withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1, false));
      energy.set(withTiming(1, { duration: duration.slow }));
    } else {
      energy.set(
        withTiming(0, { duration: duration.slow }, (finished) => {
          if (finished) cancelAnimation(clock);
        }),
      );
    }
  }, [active, clock, energy]);

  return (
    <View className="my-7 h-10 flex-row items-center justify-center gap-[3px]">
      {BARS.map((bar, i) => (
        <Bar key={i} {...bar} clock={clock} energy={energy} color={active ? color : idleColor} />
      ))}
    </View>
  );
}

function Bar({
  seed,
  freq,
  amp,
  clock,
  energy,
  color,
}: {
  seed: number;
  freq: number;
  amp: number;
  clock: SharedValue<number>;
  energy: SharedValue<number>;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    // Integer frequencies keep the loop seamless when the clock wraps 1 → 0.
    const wave = Math.abs(Math.sin(2 * Math.PI * (clock.get() * freq + seed)));
    return { height: 4 + energy.get() * amp * 36 * wave };
  });
  return <Animated.View style={[{ width: 3, borderRadius: 2, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  artShadow: {
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
});
