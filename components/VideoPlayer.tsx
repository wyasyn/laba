import { LiveDot } from "@/components/ui/LiveDot";
import { Slider } from "@/components/ui/Slider";
import { Text } from "@/components/ui/Text";
import { useT } from "@/lib/i18n";
import { duration } from "@/lib/motion";
import { useTheme } from "@/lib/useTheme";
import { usePlayerStore } from "@/stores/usePlayerStore";
import {
  ArrowDown01Icon,
  ArrowExpandIcon,
  ArrowLeft01Icon,
  ArrowShrinkIcon,
  FullscreenIcon,
  MinimizeScreenIcon,
  PauseIcon,
  PictureInPictureOnIcon,
  PlayIcon,
  ReloadIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMuteIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { IconSvgElement } from "@hugeicons/react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as ScreenOrientation from "expo-screen-orientation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Video, {
  type OnBufferData,
  type OnLoadData,
  type OnPictureInPictureStatusChangedData,
  type VideoRef,
} from "react-native-video";

interface VideoPlayerProps {
  streamUrl: string;
  /** Shown in the media notification and lock screen while the stream plays in the background. */
  title?: string;
  artworkUrl?: string;
  /** Shown as "Report a problem" on the error screen. */
  onReport?: (error: string) => void;
  onError?: (error: string) => void;
  onReady?: () => void;
  borderless?: boolean;
  onBack?: () => void;
}

const CONTROLS_TIMEOUT = 4000;
const NO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 };
const HIT_SLOP = 16;

type PlaybackStatus =
  | { kind: "loading" }
  | { kind: "buffering" }
  | { kind: "playing" }
  | { kind: "error"; message: string };

type PlaybackAction =
  | { type: "loading" }
  | { type: "loaded" }
  | { type: "buffering"; value: boolean }
  | { type: "error"; message: string };

function playbackReducer(state: PlaybackStatus, action: PlaybackAction): PlaybackStatus {
  switch (action.type) {
    case "loading":
      return { kind: "loading" };
    case "loaded":
      return { kind: "playing" };
    case "buffering":
      if (state.kind === "error" || state.kind === "loading") return state;
      return action.value ? { kind: "buffering" } : { kind: "playing" };
    case "error":
      return { kind: "error", message: action.message };
    default:
      return state;
  }
}

export function VideoPlayer({
  streamUrl,
  title,
  artworkUrl,
  onReport,
  onError,
  onReady,
  borderless = false,
  onBack,
}: VideoPlayerProps) {
  const { colors } = useTheme();
  const { t } = useT();
  const videoRef = useRef<VideoRef>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const [status, dispatch] = useReducer(playbackReducer, { kind: "loading" });
  const [isPaused, setIsPaused] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [fill, setFill] = useState(true);
  const insets = useSafeAreaInsets();
  const edges = isFullscreen ? insets : NO_INSETS;

  // TV and radio never talk over each other: if radio starts while this
  // player is still mounted (a radio screen opened on top), pause the video.
  const radioPlaying = usePlayerStore((s) => s.currentStation !== null && s.wantsPlaying);
  const [prevRadioPlaying, setPrevRadioPlaying] = useState(radioPlaying);
  if (radioPlaying !== prevRadioPlaying) {
    setPrevRadioPlaying(radioPlaying);
    if (radioPlaying) setIsPaused(true);
  }

  const isLoading = status.kind === "loading";
  const isBuffering = status.kind === "buffering";
  const hasError = status.kind === "error";
  const errorMessage = hasError ? status.message : null;

  // Animated controls opacity
  const controlsOpacity = useSharedValue(1);
  const [controlsVisible, setControlsVisible] = useState(true);

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const safeSetControlsVisible = useCallback((value: boolean) => {
    if (mountedRef.current) setControlsVisible(value);
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!mountedRef.current) return;
      controlsOpacity.set(
        withTiming(0, { duration: 300 }, (finished) => {
          "worklet";
          if (finished) runOnJS(safeSetControlsVisible)(false);
        })
      );
      setShowVolumeSlider(false);
    }, CONTROLS_TIMEOUT);
  }, [controlsOpacity, safeSetControlsVisible]);

  const showControls = useCallback(() => {
    safeSetControlsVisible(true);
    controlsOpacity.set(withTiming(1, { duration: 200 }));
    scheduleHide();
  }, [controlsOpacity, scheduleHide, safeSetControlsVisible]);

  const toggleControls = useCallback(() => {
    if (controlsVisible) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      controlsOpacity.set(
        withTiming(0, { duration: 300 }, (finished) => {
          "worklet";
          if (finished) runOnJS(safeSetControlsVisible)(false);
        })
      );
      setShowVolumeSlider(false);
    } else {
      showControls();
    }
  }, [controlsVisible, controlsOpacity, showControls, safeSetControlsVisible]);

  // Mount/unmount lifecycle — restore orientation and clear timers
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      );
      StatusBar.setHidden(false);
    };
  }, []);

  // Auto-hide controls when entering a stable playing state
  useEffect(() => {
    if (status.kind === "playing") {
      scheduleHide();
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [status.kind, scheduleHide]);

  const handleLoad = useCallback(
    (_data: OnLoadData) => {
      dispatch({ type: "loaded" });
      onReady?.();
    },
    [onReady],
  );

  const handleError = useCallback(
    (e: { error: { errorString?: string } }) => {
      const message = e.error.errorString || "Stream failed to load";
      dispatch({ type: "error", message });
      onError?.(message);
    },
    [onError],
  );

  const handleBuffer = useCallback(({ isBuffering: buffering }: OnBufferData) => {
    dispatch({ type: "buffering", value: buffering });
  }, []);

  const handlePipChange = useCallback(({ isActive }: OnPictureInPictureStatusChangedData) => {
    setIsPip(isActive);
  }, []);

  const enterPip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    videoRef.current?.enterPictureInPicture();
  }, []);

  const handleRetry = useCallback(() => {
    dispatch({ type: "loading" });
    setIsPaused(false);
    setReloadKey((k) => k + 1);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isFullscreen) {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      );
      StatusBar.setHidden(false);
    } else {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      );
      StatusBar.setHidden(true);
    }
    setIsFullscreen((f) => !f);
    showControls();
  }, [isFullscreen, showControls]);

  const togglePlay = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPaused((p) => !p);
    showControls();
  }, [showControls]);

  // Keep controls up while the volume is being adjusted
  useEffect(() => {
    if (showVolumeSlider) scheduleHide();
  }, [volume, showVolumeSlider, scheduleHide]);

  const volumeIcon =
    volume === 0
      ? VolumeMuteIcon
      : volume < 0.5
        ? VolumeLowIcon
        : VolumeHighIcon;

  // The PiP window shows the bare video; our controls would be unusable there.
  const overlays = isPip ? null : (
    <>
      {/* Buffering spinner */}
      {isBuffering && (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Initial loading overlay */}
      {isLoading && (
        <View className="absolute inset-0 items-center justify-center bg-black/60">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-3 text-[13px] text-white/70">
            {t("video.loading")}
          </Text>
        </View>
      )}

      {/* Error overlay */}
      {hasError && (
        <View className="absolute inset-0 items-center justify-center bg-black/80 px-6">
          <Text className="mb-1 text-center text-sm text-white/80">
            {errorMessage}
          </Text>
          <Text className="mb-4 text-center text-xs text-white/50">
            {t("video.hint")}
          </Text>
          <Pressable
            onPress={handleRetry}
            className="flex-row items-center gap-2 rounded-lg bg-primary px-6 py-3"
            accessibilityRole="button"
            accessibilityLabel={t("video.retryLabel")}
          >
            <HugeiconsIcon icon={ReloadIcon} size={18} color={colors.onPrimary} />
            <Text className="font-semibold text-primary-foreground">{t("player.retry")}</Text>
          </Pressable>
          {onReport && errorMessage ? (
            <Pressable
              onPress={() => onReport(errorMessage)}
              hitSlop={HIT_SLOP}
              className="mt-3 active:opacity-60"
              accessibilityRole="button"
            >
              <Text className="text-xs font-semibold text-white/70 underline">{t("station.report")}</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {/* Controls: a tap on the picture shows them, and they fade after a few seconds.
          Scrims darken only the top and bottom edges so the picture stays visible. */}
      {!hasError && !isLoading && (
        <Pressable onPress={toggleControls} className="absolute inset-0">
          <Animated.View className="flex-1" style={controlsStyle}>
            {controlsVisible && (
              <View className="absolute inset-0">
                <LinearGradient
                  pointerEvents="none"
                  colors={["rgba(0,0,0,0.75)", "rgba(0,0,0,0)"]}
                  style={[styles.scrim, styles.scrimTop]}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.8)"]}
                  style={[styles.scrim, styles.scrimBottom]}
                />

                <View
                  className="flex-1"
                  style={{
                    paddingTop: edges.top,
                    paddingBottom: edges.bottom,
                    paddingLeft: edges.left,
                    paddingRight: edges.right,
                  }}
                >
                  {/* Top bar: back, what is on, picture options */}
                  <View className="flex-row items-center gap-3 px-4 pt-3">
                    {isFullscreen ? (
                      <ControlButton
                        icon={ArrowLeft01Icon}
                        label={t("video.exitFullscreen")}
                        onPress={toggleFullscreen}
                      />
                    ) : onBack ? (
                      <ControlButton icon={ArrowDown01Icon} label={t("station.close")} onPress={onBack} />
                    ) : null}
                    <View className="min-w-0 flex-1">
                      {isFullscreen && title ? (
                        <>
                          <Text numberOfLines={1} className="text-[16px] font-bold text-white">
                            {title}
                          </Text>
                          <Text numberOfLines={1} className="text-[12px] text-white/70">
                            {t("video.lockScreenSubtitle")}
                          </Text>
                        </>
                      ) : null}
                    </View>
                    {isFullscreen ? (
                      <ControlButton
                        icon={fill ? ArrowShrinkIcon : ArrowExpandIcon}
                        label={fill ? t("video.fit") : t("video.fill")}
                        onPress={() => {
                          setFill((f) => !f);
                          showControls();
                        }}
                      />
                    ) : null}
                    <ControlButton icon={PictureInPictureOnIcon} label={t("video.pip")} onPress={enterPip} />
                  </View>

                  {/* Center play/pause */}
                  <View className="flex-1 items-center justify-center">
                    <Pressable
                      onPress={togglePlay}
                      hitSlop={HIT_SLOP}
                      accessibilityRole="button"
                      accessibilityLabel={isPaused ? t("player.play") : t("player.pause")}
                      accessibilityHint={t("video.toggleHint")}
                      className="rounded-full bg-black/40 p-4 active:opacity-70"
                    >
                      <HugeiconsIcon
                        icon={isPaused ? PlayIcon : PauseIcon}
                        size={isFullscreen ? 40 : 32}
                        color="#fff"
                        fill="#fff"
                      />
                    </Pressable>
                  </View>

                  {/* Bottom bar: volume, the live position, fullscreen */}
                  <View className="flex-row items-center gap-3 px-4 pb-3">
                    <ControlButton
                      icon={volumeIcon}
                      label={t("video.volume")}
                      onPress={() => {
                        setShowVolumeSlider((v) => !v);
                        showControls();
                      }}
                    />
                    {showVolumeSlider ? (
                      <Animated.View
                        entering={FadeIn.duration(duration.fast)}
                        exiting={FadeOut.duration(duration.fast)}
                        className="w-[110px]"
                      >
                        <Slider
                          value={volume}
                          onChange={(v) => {
                            setVolume(v);
                            showControls();
                          }}
                          trackColor="rgba(255,255,255,0.3)"
                          height={32}
                        />
                      </Animated.View>
                    ) : null}
                    <View className="flex-row items-center gap-1.5 rounded-md bg-error px-2 py-1">
                      <LiveDot color="#FFFFFF" size={6} />
                      <Text className="text-[11px] font-bold uppercase tracking-widest text-white">
                        {t("player.live")}
                      </Text>
                    </View>
                    {/* A live stream always sits at its live edge: a full track. */}
                    <View className="h-[3px] flex-1 justify-center rounded-full bg-white/85">
                      <View className="absolute -right-1 h-3 w-3 rounded-full bg-error" />
                    </View>
                    <ControlButton
                      icon={isFullscreen ? MinimizeScreenIcon : FullscreenIcon}
                      label={isFullscreen ? t("video.exitFullscreen") : t("video.enterFullscreen")}
                      onPress={toggleFullscreen}
                    />
                  </View>
                </View>
              </View>
            )}
          </Animated.View>
        </Pressable>
      )}
    </>
  );

  const videoElement = (
    <Video
      key={reloadKey}
      ref={videoRef}
      source={{
        uri: streamUrl,
        metadata: { title, artist: t("video.lockScreenSubtitle"), imageUri: artworkUrl },
      }}
      style={{ width: "100%", height: "100%" }}
      // Fullscreen fills the screen by default (a 16:9 picture on a taller phone
      // screen would otherwise leave bars at the sides); Fit brings the bars back.
      resizeMode={isFullscreen && fill ? "cover" : "contain"}
      paused={isPaused}
      volume={volume}
      onLoad={handleLoad}
      onError={handleError}
      onBuffer={handleBuffer}
      // Leaving the app floats the stream in a picture-in-picture window, and
      // its audio carries on with media controls when PiP is closed or unavailable.
      enterPictureInPictureOnLeave
      onPictureInPictureStatusChanged={handlePipChange}
      playInBackground
      playWhenInactive
      showNotificationControls
      bufferConfig={{
        minBufferMs: 5000,
        maxBufferMs: 30000,
        bufferForPlaybackMs: 800,
        bufferForPlaybackAfterRebufferMs: 2000,
      }}
      maxBitRate={2000000}
    />
  );

  return (
    <>
      {/* Inline player */}
      <View
        className={`aspect-video w-full overflow-hidden bg-black ${borderless ? "" : "rounded-xl"}`}
      >
        {!isFullscreen && (
          <>
            {videoElement}
            {overlays}
          </>
        )}
      </View>

      {/* Fullscreen: the picture runs edge to edge, under the system bars; only the
          controls keep clear of the notch and the gesture areas. */}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        supportedOrientations={["landscape"]}
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={toggleFullscreen}
      >
        <GestureHandlerRootView className="flex-1">
          <View className="flex-1 bg-black">
            {videoElement}
            {overlays}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}

function ControlButton({
  icon,
  label,
  onPress,
}: {
  icon: IconSvgElement;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full bg-black/40 p-2 active:opacity-70"
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <HugeiconsIcon icon={icon} size={20} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    height: "40%",
  },
  scrimTop: { top: 0 },
  scrimBottom: { bottom: 0 },
});
