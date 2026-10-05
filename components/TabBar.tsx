import { GlassView } from "@/components/ui/GlassView";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { useT } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { duration, easing } from "@/lib/motion";
import { useTheme } from "@/lib/useTheme";
import { useChromeStore } from "@/stores/useChromeStore";
import type { Tabs } from "expo-router";
import { useEffect, type ComponentProps } from "react";
import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** expo-router ships its own copy of the bottom-tabs types, so take them from its Tabs. */
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

/** Height of the floating pill itself. */
const PILL_HEIGHT = 64;
/** Gap between the pill and the bottom safe area. */
const PILL_GAP = 8;
/** Space the bar takes above the bottom safe area. */
export const TAB_BAR_HEIGHT = PILL_HEIGHT + PILL_GAP;

/** Outline icon by default, filled when selected. Sources live in assets/images/tabs/svg. */
const TABS: Record<string, { label: MessageKey; icon: ImageSourcePropType; selected: ImageSourcePropType }> = {
  index: {
    label: "tabs.home",
    icon: require("@/assets/images/tabs/home.png"),
    selected: require("@/assets/images/tabs/home-filled.png"),
  },
  tv: {
    label: "tabs.tv",
    icon: require("@/assets/images/tabs/live_tv.png"),
    selected: require("@/assets/images/tabs/live_tv-filled.png"),
  },
  radio: {
    label: "tabs.radio",
    icon: require("@/assets/images/tabs/radio.png"),
    selected: require("@/assets/images/tabs/radio-filled.png"),
  },
  settings: {
    label: "tabs.settings",
    icon: require("@/assets/images/tabs/settings.png"),
    selected: require("@/assets/images/tabs/settings-filled.png"),
  },
};

/**
 * Floating pill tab bar drawn over the screens so it can slide away while a
 * list scrolls down (see useHideTabBarOnScroll) and give that space to the content.
 */
export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, resolved } = useTheme();
  const { t } = useT();
  const hidden = useChromeStore((s) => s.tabBarHidden);
  // Extra distance so the shadow is off screen too once hidden.
  const height = TAB_BAR_HEIGHT + insets.bottom + 24;

  const progress = useSharedValue(hidden ? 1 : 0);
  useEffect(() => {
    progress.set(withTiming(hidden ? 1 : 0, { duration: duration.base, easing: easing.standard }));
  }, [hidden, progress]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.get() * height }],
  }));

  return (
    <Animated.View
      pointerEvents={hidden ? "none" : "auto"}
      style={[
        styles.bar,
        {
          bottom: insets.bottom + PILL_GAP,
          borderColor: colors.border,
          boxShadow: resolved === "dark"
            ? "0 8px 24px rgba(0,0,0,0.45)"
            : "0 8px 24px rgba(0,0,0,0.12)",
        },
        slideStyle,
      ]}
    >
      <GlassView style={[StyleSheet.absoluteFill, styles.round]} intensity={60} />
      <View className="flex-1 flex-row" style={styles.row}>
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = state.index === index;
          const color = focused ? colors.textPrimary : colors.textSecondary;

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => navigation.emit({ type: "tabLongPress", target: route.key });

          return (
            <PressableScale
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              scaleTo={0.92}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t(tab.label)}
              containerClassName="flex-1"
              className="flex-1 items-center justify-center gap-1"
            >
              {/* The tint is always rendered and only its opacity changes: toggling the
                  background from transparent lets the view get flattened and recreated,
                  and the recreated view lost its corner radius. */}
              <View
                collapsable={false}
                style={[
                  styles.itemTint,
                  { backgroundColor: `${colors.textPrimary}14`, opacity: focused ? 1 : 0 },
                ]}
              />
              <Image
                source={focused ? tab.selected : tab.icon}
                style={[styles.icon, { tintColor: color }]}
              />
              <Text
                numberOfLines={1}
                className="text-[11px]"
                style={{ color, fontWeight: focused ? "700" : "600" }}
              >
                {t(tab.label)}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 16,
    right: 16,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  round: {
    borderRadius: PILL_HEIGHT / 2,
  },
  row: {
    padding: 5,
  },
  itemTint: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: (PILL_HEIGHT - 10) / 2,
  },
  icon: {
    width: 24,
    height: 24,
  },
});
