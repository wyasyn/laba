import { StationArtwork } from "@/components/StationArtwork";
import { openStation } from "@/components/StationCard";
import { GlassView } from "@/components/ui/GlassView";
import { IconButton } from "@/components/ui/IconButton";
import { LiveDot } from "@/components/ui/LiveDot";
import { PlayPauseButton } from "@/components/ui/PlayPauseButton";
import { Text } from "@/components/ui/Text";
import { haptic, spring } from "@/lib/motion";
import { useTheme } from "@/lib/useTheme";
import { usePlayerStore, type PlaybackStatus } from "@/stores/usePlayerStore";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  SlideInDown,
  SlideOutDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

function statusLabel(status: PlaybackStatus) {
  switch (status) {
    case "loading":
      return "Connecting…";
    case "playing":
      return "Live";
    case "paused":
      return "Paused";
    case "error":
      return "Tap to retry";
    default:
      return "";
  }
}

/** Shared content row used by both the floating card and the iOS tab accessory. */
function MiniPlayerRow({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { colors } = useTheme();
  const current = usePlayerStore((s) => s.currentStation);
  const status = usePlayerStore((s) => s.status);
  // Keep showing the last station while the card animates out after stop().
  const [last, setLast] = useState(current);
  if (current && current !== last) setLast(current);
  const station = current ?? last;
  const togglePlayback = usePlayerStore((s) => s.togglePlayback);
  const stop = usePlayerStore((s) => s.stop);

  if (!station) return null;

  return (
    <View className={compact ? "flex-row items-center gap-2.5 px-2" : "flex-row items-center gap-3 p-2 pr-3"}>
      <Pressable
        onPress={() => {
          haptic.tap();
          openStation(router, station);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Open ${station.name}`}
        className="flex-1 flex-row items-center gap-3"
      >
        <View
          style={{ width: compact ? 30 : 46, height: compact ? 30 : 46, borderRadius: compact ? 8 : 12 }}
          className="overflow-hidden"
        >
          <StationArtwork station={station} variant="tile" />
        </View>
        <View className="flex-1">
          <Text numberOfLines={1} className={compact ? "text-[13px] font-semibold" : "text-[15px] font-semibold"}>
            {station.name}
          </Text>
          {!compact ? (
            <View className="mt-0.5 flex-row items-center gap-1.5">
              {status === "playing" ? <LiveDot size={6} color={colors.primary} /> : null}
              <Text
                className={
                  status === "error"
                    ? "text-xs font-medium text-error"
                    : status === "playing"
                      ? "text-xs font-semibold text-primary"
                      : "text-xs text-text-secondary"
                }
              >
                {statusLabel(status)}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
      <PlayPauseButton
        status={status}
        onPress={togglePlayback}
        size={compact ? 32 : 42}
        background={colors.primary}
        color="#FFFFFF"
      />
      {!compact ? (
        <IconButton
          icon={Cancel01Icon}
          onPress={stop}
          accessibilityLabel="Stop and close player"
          variant="ghost"
          size={34}
          iconSize={18}
          color={colors.textSecondary}
        />
      ) : null}
    </View>
  );
}

/** Content for NativeTabs.BottomAccessory (iOS 26+). */
export function MiniPlayerAccessory({ placement }: { placement: "regular" | "inline" }) {
  return <MiniPlayerRow compact={placement === "inline"} />;
}

/**
 * Floating card above the tab bar (Android and iOS < 26). Slides in when a
 * station starts, swipe down to stop and dismiss.
 */
export function FloatingMiniPlayer({ bottom }: { bottom: number }) {
  const hasStation = usePlayerStore((s) => s.currentStation !== null);
  const stop = usePlayerStore((s) => s.stop);
  const dragY = useSharedValue(0);

  const dismiss = () => {
    haptic.tap();
    stop();
  };

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-12, 12])
    .onUpdate((e) => {
      dragY.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > 50 || e.velocityY > 800) {
        scheduleOnRN(dismiss);
        dragY.set(0);
      } else {
        dragY.set(withSpring(0, spring.snappy));
      }
    });

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.get() }],
    opacity: interpolate(dragY.get(), [0, 120], [1, 0.4]),
  }));

  if (!hasStation) return null;

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18).stiffness(180)}
      exiting={SlideOutDown.duration(220)}
      style={[styles.floating, { bottom }]}
      pointerEvents="box-none"
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.shadow, dragStyle]}>
          <GlassView intensity={70} className="rounded-[22px] border border-border" style={{ borderCurve: "continuous" }}>
            <MiniPlayerRow />
          </GlassView>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floating: {
    position: "absolute",
    left: 12,
    right: 12,
  },
  shadow: {
    borderRadius: 22,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
