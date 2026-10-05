import { FloatingMiniPlayer, MiniPlayerAccessory } from "@/components/MiniPlayer";
import { TAB_BAR_HEIGHT, TabBar } from "@/components/TabBar";
import { FONT_FAMILY } from "@/constants/theme";
import { useT } from "@/lib/i18n";
import { useTheme } from "@/lib/useTheme";
import { useChromeStore } from "@/stores/useChromeStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * iOS 26 has the native tab bar accessory slot and minimize-on-scroll (Liquid
 * Glass), so it keeps the native tabs. Elsewhere the native bar can only pop in
 * and out, so a JS bar that slides away on scroll is used instead.
 */
const HAS_NATIVE_ACCESSORY =
  Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;

function AccessoryContent() {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  return <MiniPlayerAccessory placement={placement} />;
}

export default function TabLayout() {
  return HAS_NATIVE_ACCESSORY ? <NativeTabLayout /> : <JsTabLayout />;
}

function JsTabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHidden = useChromeStore((s) => s.tabBarHidden);

  return (
    <View className="flex-1 bg-background">
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="tv" />
        <Tabs.Screen name="radio" />
        <Tabs.Screen name="settings" />
      </Tabs>
      <FloatingMiniPlayer bottom={insets.bottom + (tabBarHidden ? 0 : TAB_BAR_HEIGHT) + 10} />
    </View>
  );
}

function NativeTabLayout() {
  const { t } = useT();
  const { colors } = useTheme();
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
        minimizeBehavior="onScrollDown"
      >
        {hasStation ? (
          <NativeTabs.BottomAccessory>
            <AccessoryContent />
          </NativeTabs.BottomAccessory>
        ) : null}

        {/* Custom icon set (outline by default, filled when selected).
            Sources live in assets/images/tabs/svg. */}
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>{t("tabs.home")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={{
              default: require("@/assets/images/tabs/home.png"),
              selected: require("@/assets/images/tabs/home-filled.png"),
            }}
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="tv">
          <NativeTabs.Trigger.Label>{t("tabs.tv")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={{
              default: require("@/assets/images/tabs/live_tv.png"),
              selected: require("@/assets/images/tabs/live_tv-filled.png"),
            }}
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="radio">
          <NativeTabs.Trigger.Label>{t("tabs.radio")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={{
              default: require("@/assets/images/tabs/radio.png"),
              selected: require("@/assets/images/tabs/radio-filled.png"),
            }}
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Label>{t("tabs.settings")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={{
              default: require("@/assets/images/tabs/settings.png"),
              selected: require("@/assets/images/tabs/settings-filled.png"),
            }}
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    </View>
  );
}
