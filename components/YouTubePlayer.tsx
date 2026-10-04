import {
  ArrowDown01Icon,
  FullscreenIcon,
  MinimizeScreenIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as ScreenOrientation from "expo-screen-orientation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { WebView } from "react-native-webview";

interface YouTubePlayerProps {
  channelId: string;
  borderless?: boolean;
  onBack?: () => void;
}

const BACK_TIMEOUT = 4000;

function buildEmbedUrl(channelId: string) {
  return (
    `https://www.youtube.com/embed/live_stream` +
    `?channel=${channelId}&autoplay=1&playsinline=1&rel=0&modestbranding=1`
  );
}

export function YouTubePlayer({
  channelId,
  borderless = false,
  onBack,
}: YouTubePlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const backTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const revealBack = useCallback(() => {
    setShowBack(true);
    if (backTimer.current) clearTimeout(backTimer.current);
    backTimer.current = setTimeout(() => setShowBack(false), BACK_TIMEOUT);
  }, []);

  useEffect(() => {
    return () => {
      if (backTimer.current) clearTimeout(backTimer.current);
    };
  }, []);

  const enterFullscreen = useCallback(async () => {
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE
    );
    StatusBar.setHidden(true);
    setIsFullscreen(true);
  }, []);

  const exitFullscreen = useCallback(async () => {
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP
    );
    StatusBar.setHidden(false);
    setIsFullscreen(false);
  }, []);

  const webview = (
    <WebView
      source={{ uri: buildEmbedUrl(channelId) }}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      allowsFullscreenVideo={false}
      javaScriptEnabled
      domStorageEnabled
      style={{ flex: 1, backgroundColor: "black" }}
    />
  );

  const fullscreenButton = (
    <Pressable
      onPress={isFullscreen ? exitFullscreen : enterFullscreen}
      className="absolute bottom-3 right-4 rounded-full bg-black/50 p-2"
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
    >
      <HugeiconsIcon
        icon={isFullscreen ? MinimizeScreenIcon : FullscreenIcon}
        size={20}
        color="#fff"
      />
    </Pressable>
  );

  const backOverlay = onBack ? (
    <>
      {/* Top-left tap zone to reveal the back button */}
      <Pressable
        onPress={revealBack}
        className="absolute left-0 top-0 h-16 w-20"
        accessibilityRole="button"
        accessibilityLabel="Show back button"
      />
      {showBack && (
        <Pressable
          onPress={onBack}
          className="absolute left-3 top-3 rounded-full bg-black/60 p-2"
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close player"
        >
          <HugeiconsIcon icon={ArrowDown01Icon} size={20} color="#fff" />
        </Pressable>
      )}
    </>
  ) : null;

  return (
    <>
      {/* Inline player */}
      <View
        className={`aspect-video w-full overflow-hidden bg-black ${borderless ? "" : "rounded-xl"}`}
      >
        {!isFullscreen && (
          <>
            {webview}
            {fullscreenButton}
            {backOverlay}
          </>
        )}
      </View>

      {/* Fullscreen modal */}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        supportedOrientations={["landscape"]}
        statusBarTranslucent
        onRequestClose={exitFullscreen}
      >
        <GestureHandlerRootView className="flex-1">
          <View className="flex-1 bg-black">
            {webview}
            {fullscreenButton}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}
