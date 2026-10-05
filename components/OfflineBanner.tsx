import { Text } from "@/components/ui/Text";
import { useT } from "@/lib/i18n";
import { duration, easing } from "@/lib/motion";
import { useNetworkStore } from "@/stores/useNetworkStore";
import { WifiDisconnected02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { StyleSheet, View } from "react-native";
import Animated, { FadeOutUp, SlideInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Small pill that drops in under the status bar while the device is offline.
 * Mounted once at the root, above every screen, and never takes touches.
 */
export function OfflineBanner() {
  const isOnline = useNetworkStore((s) => s.isOnline);
  const insets = useSafeAreaInsets();
  const { t } = useT();

  if (isOnline) return null;

  return (
    <Animated.View
      entering={SlideInUp.duration(duration.base).easing(easing.standard)}
      exiting={FadeOutUp.duration(duration.fast)}
      pointerEvents="none"
      style={[styles.wrap, { top: insets.top + 6 }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <View style={styles.pill}>
        <HugeiconsIcon icon={WifiDisconnected02Icon} size={15} color="#FFFFFF" />
        <Text className="text-[13px] font-semibold" style={{ color: "#FFFFFF" }}>
          {t("offline.banner")}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    // Fixed dark pill so it reads the same over light and dark screens.
    backgroundColor: "rgba(24, 24, 22, 0.92)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
