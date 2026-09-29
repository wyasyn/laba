import { FloatingMiniPlayer, MiniPlayerAccessory } from "@/components/MiniPlayer";
import { FONT_FAMILY } from "@/constants/theme";
import { useTheme } from "@/lib/useTheme";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** iOS 26 has the native tab bar accessory slot (Liquid Glass). */
const HAS_NATIVE_ACCESSORY =
  Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;

/** Approximate native tab bar heights, used to float the mini-player above them. */
const TAB_BAR_HEIGHT = Platform.OS === "android" ? 80 : 49;

function AccessoryContent() {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  return <MiniPlayerAccessory placement={placement} />;
}

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const hasStation = usePlayerStore((s) => s.currentStation !== null);

  return (
    <View className="flex-1 bg-background">
      <NativeTabs
        tintColor={colors.primary}
        iconColor={{ default: colors.textSecondary, selected: colors.primary }}
        labelStyle={{
          default: { color: colors.textSecondary, fontSize: 11, fontFamily: FONT_FAMILY, fontWeight: "600" },
          selected: { color: colors.primary, fontSize: 11, fontFamily: FONT_FAMILY, fontWeight: "700" },
        }}
        // iOS uses the system (Liquid Glass) material; Android needs an explicit surface
        backgroundColor={Platform.OS === "android" ? colors.surface : undefined}
        indicatorColor={`${colors.primary}26`}
        // Android defaults to "auto" (labels only on the selected tab once there are 4+ tabs)
        labelVisibilityMode="labeled"
        minimizeBehavior="onScrollDown"
      >
        {HAS_NATIVE_ACCESSORY && hasStation ? (
          <NativeTabs.BottomAccessory>
            <AccessoryContent />
          </NativeTabs.BottomAccessory>
        ) : null}

        {/* Custom icon set on both platforms (outline by default, filled when
            selected). Sources live in assets/images/tabs/svg. */}
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={{
              default: require("@/assets/images/tabs/home.png"),
              selected: require("@/assets/images/tabs/home-filled.png"),
            }}
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="tv">
          <NativeTabs.Trigger.Label>TV</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={{
              default: require("@/assets/images/tabs/live_tv.png"),
              selected: require("@/assets/images/tabs/live_tv-filled.png"),
            }}
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="radio">
          <NativeTabs.Trigger.Label>Radio</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={{
              default: require("@/assets/images/tabs/radio.png"),
              selected: require("@/assets/images/tabs/radio-filled.png"),
            }}
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="favourites">
          <NativeTabs.Trigger.Label>Favourites</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={{
              default: require("@/assets/images/tabs/favorite.png"),
              selected: require("@/assets/images/tabs/favorite-filled.png"),
            }}
          />
        </NativeTabs.Trigger>
      </NativeTabs>

      {!HAS_NATIVE_ACCESSORY ? (
        <FloatingMiniPlayer bottom={insets.bottom + TAB_BAR_HEIGHT + 10} />
      ) : null}
    </View>
  );
}
