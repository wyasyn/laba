import { useTheme } from "@/lib/useTheme";
import {
  ArrowLeft01Icon,
  FullscreenIcon,
  MinimizeScreenIcon,
  PauseIcon,
  PlayCircleIcon,
  ReloadIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMuteIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as Haptics from "expo-haptics";
import * as ScreenOrientation from "expo-screen-orientation";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StatusBar,
  Text,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Video, {
  type OnBufferData,
  type OnLoadData,
  type VideoRef,
} from "react-native-video";

interface VideoPlayerProps {
  streamUrl: string;
  onError?: (error: string) => void;
  onReady?: () => void;
  borderless?: boolean;
  onBack?: () => void;
}

const CONTROLS_TIMEOUT = 4000;
const VOLUME_SLIDER_WIDTH = 120;
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

export function VideoPlayer({ streamUrl, onError, onReady, borderless = false, onBack }: VideoPlayerProps) {
  const { colors } = useTheme();
  const videoRef = useRef<VideoRef>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const [status, dispatch] = useReducer(playbackReducer, { kind: "loading" });
  const [isPaused, setIsPaused] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

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

  // Volume slider gesture — memoized so it isn't recreated each render
  const volumeGesture = useMemo(
    () =>
      Gesture.Pan().onUpdate((e) => {
        "worklet";
        const pct = Math.min(1, Math.max(0, e.x / VOLUME_SLIDER_WIDTH));
        runOnJS(setVolume)(pct);
      }),
    [],
  );

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

  const overlays = (
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
            Loading stream...
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
            Check your connection and try again
          </Text>
          <Pressable
            onPress={handleRetry}
            className="flex-row items-center gap-2 rounded-lg bg-primary px-6 py-3"
            accessibilityRole="button"
            accessibilityLabel="Retry loading stream"
          >
            <HugeiconsIcon icon={ReloadIcon} size={18} color="#fff" />
            <Text className="font-semibold text-white">Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Controls overlay */}
      {!hasError && !isLoading && (
        <Pressable onPress={toggleControls} className="absolute inset-0">
          <Animated.View className="flex-1" style={controlsStyle}>
            {controlsVisible && (
              <View className="absolute inset-0 bg-black/40">
                {/* Top bar — back (fullscreen only) + volume */}
                <View className="flex-row items-center justify-between px-4 pt-3">
                  {isFullscreen ? (
                    <Pressable
                      onPress={toggleFullscreen}
                      className="rounded-full bg-black/50 p-2"
                      hitSlop={HIT_SLOP}
                      accessibilityRole="button"
                      accessibilityLabel="Exit fullscreen"
                    >
                      <HugeiconsIcon
                        icon={ArrowLeft01Icon}
                        size={20}
                        color="#fff"
                      />
                    </Pressable>
                  ) : onBack ? (
                    <Pressable
                      onPress={onBack}
                      className="rounded-full bg-black/50 p-2"
                      hitSlop={HIT_SLOP}
                      accessibilityRole="button"
                      accessibilityLabel="Go back"
                    >
                      <HugeiconsIcon
                        icon={ArrowLeft01Icon}
                        size={20}
                        color="#fff"
                      />
                    </Pressable>
                  ) : (
                    <View />
                  )}
                  <Pressable
                    onPress={() => {
                      setShowVolumeSlider((v) => !v);
                      showControls();
                    }}
                    className="rounded-full bg-black/50 p-2"
                    hitSlop={HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel="Adjust volume"
                  >
                    <HugeiconsIcon icon={volumeIcon} size={20} color="#fff" />
                  </Pressable>
                </View>

                {/* Volume slider */}
                {showVolumeSlider && (
                  <View className="absolute right-14 top-3.5 flex-row items-center">
                    <View className="h-8 w-[120px] overflow-hidden rounded-full bg-black/60">
                      <GestureDetector gesture={volumeGesture}>
                        <Pressable
                          onPress={(e) => {
                            const pct = Math.min(
                              1,
                              Math.max(0, e.nativeEvent.locationX / VOLUME_SLIDER_WIDTH),
                            );
                            setVolume(pct);
                            showControls();
                          }}
                          className="h-8 w-[120px] justify-center"
                        >
                          <View className="mx-2 h-1 rounded-full bg-white/30">
                            <View
                              className="h-1 rounded-full bg-primary"
                              style={{ width: `${volume * 100}%` }}
                            />
                          </View>
                          <View
                            className="absolute h-4 w-4 rounded-full bg-white"
                            style={{
                              left: 8 + volume * (VOLUME_SLIDER_WIDTH - 24),
                              top: 8,
                            }}
                          />
                        </Pressable>
                      </GestureDetector>
                    </View>
                  </View>
                )}

                {/* Center play/pause */}
                <View className="flex-1 items-center justify-center">
                  <Pressable
                    onPress={togglePlay}
                    hitSlop={HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel={isPaused ? "Play" : "Pause"}
                    accessibilityHint="Toggle playback"
                    className="rounded-full bg-black/50 p-5"
                  >
                    <HugeiconsIcon
                      icon={isPaused ? PlayCircleIcon : PauseIcon}
                      size={44}
                      color="#fff"
                    />
                  </Pressable>
                </View>

                {/* Bottom bar — live badge + fullscreen */}
                <View className="flex-row items-center justify-between px-4 pb-3">
                  <View className="flex-row items-center gap-2">
                    <View className="h-2 w-2 rounded-full bg-primary" />
                    <Text className="text-xs font-semibold uppercase text-white">
                      Live
                    </Text>
                  </View>

                  <Pressable
                    onPress={toggleFullscreen}
                    className="rounded-full bg-black/50 p-2"
                    hitSlop={HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  >
                    <HugeiconsIcon
                      icon={isFullscreen ? MinimizeScreenIcon : FullscreenIcon}
                      size={20}
                      color="#fff"
                    />
                  </Pressable>
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
      source={{ uri: streamUrl }}
      style={{ width: "100%", height: "100%" }}
      resizeMode="contain"
      paused={isPaused}
      volume={volume}
      onLoad={handleLoad}
      onError={handleError}
      onBuffer={handleBuffer}
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

      {/* Fullscreen modal */}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        supportedOrientations={["landscape"]}
        statusBarTranslucent
      >
        <GestureHandlerRootView className="flex-1">
          <SafeAreaView
            className="flex-1 bg-black"
            edges={["top", "bottom", "left", "right"]}
          >
            <View className="flex-1 bg-black">
              {videoElement}
              {overlays}
            </View>
          </SafeAreaView>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}
