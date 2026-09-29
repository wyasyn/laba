import { useTheme } from "@/lib/useTheme";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <NativeTabs
      tintColor={colors.primary}
      iconColor={{ default: colors.textSecondary, selected: colors.primary }}
      labelStyle={{
        default: { color: colors.textSecondary, fontSize: 11 },
        selected: { color: colors.primary, fontSize: 11 },
      }}
      // iOS uses the system (Liquid Glass) material; Android needs an explicit surface
      backgroundColor={Platform.OS === "android" ? colors.surface : undefined}
      indicatorColor={`${colors.primary}26`}
      minimizeBehavior="onScrollDown"
    >
      {/* iOS renders the SF Symbols. Android renders the Material Symbols PNGs
          (outline by default, filled when selected) from assets/images/tabs. */}
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          src={{
            default: require("@/assets/images/tabs/home.png"),
            selected: require("@/assets/images/tabs/home-filled.png"),
          }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tv">
        <NativeTabs.Trigger.Label>TV</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "tv", selected: "tv.fill" }}
          src={{
            default: require("@/assets/images/tabs/live_tv.png"),
            selected: require("@/assets/images/tabs/live_tv-filled.png"),
          }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="radio">
        <NativeTabs.Trigger.Label>Radio</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "radio", selected: "radio.fill" }}
          src={{
            default: require("@/assets/images/tabs/radio.png"),
            selected: require("@/assets/images/tabs/radio-filled.png"),
          }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="favourites">
        <NativeTabs.Trigger.Label>Favourites</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "heart", selected: "heart.fill" }}
          src={{
            default: require("@/assets/images/tabs/favorite.png"),
            selected: require("@/assets/images/tabs/favorite-filled.png"),
          }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
