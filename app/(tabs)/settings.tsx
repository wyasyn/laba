import { CategoryRow } from "@/components/CategoryRow";
import { HeaderActions } from "@/components/HeaderActions";
import { LIST_BOTTOM_PADDING } from "@/components/StationList";
import { COMPACT_BAR_HEIGHT, CompactHeader, LargeTitle, useCollapsingHeader } from "@/components/ui/CollapsingHeader";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { haptic, spring } from "@/lib/motion";
import type { Station } from "@/lib/schemas";
import { useTheme } from "@/lib/useTheme";
import { useHideTabBarOnScroll } from "@/stores/useChromeStore";
import { useFavouritesStore } from "@/stores/useFavouritesStore";
import { useRecentsStore } from "@/stores/useRecentsStore";
import { useStationStore } from "@/stores/useStationStore";
import { useThemeStore, type ThemeMode } from "@/stores/useThemeStore";
import {
  ArrowRight01Icon,
  FavouriteIcon,
  InformationCircleIcon,
  Mail01Icon,
  Moon02Icon,
  SmartPhone01Icon,
  StarIcon,
  Sun03Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as StoreReview from "expo-store-review";
import { useEffect, useMemo, type ReactNode } from "react";
import { Alert, Linking, Pressable, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type IconSvg = Parameters<typeof HugeiconsIcon>[0]["icon"];

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
const APP_NAME = Constants.expoConfig?.name ?? "Laba";

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: IconSvg }[] = [
  { mode: "light", label: "Light", icon: Sun03Icon },
  { mode: "dark", label: "Dark", icon: Moon02Icon },
  { mode: "system", label: "Auto", icon: SmartPhone01Icon },
];

async function rateApp() {
  try {
    if (await StoreReview.hasAction()) {
      await StoreReview.requestReview();
      return;
    }
    const url = StoreReview.storeUrl();
    if (url) await Linking.openURL(url);
  } catch {}
}

/** Recently opened stations that are still in the catalogue, newest first. */
function useRecentStations() {
  const ids = useRecentsStore((s) => s.ids);
  const stations = useStationStore((s) => s.stations);
  return useMemo(() => {
    const byId = new Map(stations.map((s) => [s.id, s]));
    return ids.map((id) => byId.get(id)).filter((s): s is Station => s !== undefined);
  }, [ids, stations]);
}

function confirmClearRecents() {
  Alert.alert("Clear recently viewed?", "This removes your viewing history from this device.", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Clear",
      style: "destructive",
      onPress: () => {
        haptic.tap();
        useRecentsStore.getState().clear();
      },
    },
  ]);
}

function ClearRecentsButton() {
  return (
    <PressableScale
      onPress={confirmClearRecents}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Clear recently viewed"
      className="rounded-full bg-surface-light px-3 py-1.5"
    >
      <Text className="text-[13px] font-semibold text-text-secondary">Clear</Text>
    </PressableScale>
  );
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { scrollY, hideY, onScroll } = useCollapsingHeader({ hideDistance: COMPACT_BAR_HEIGHT });
  useHideTabBarOnScroll(hideY, COMPACT_BAR_HEIGHT);
  const favouriteCount = useFavouritesStore((s) => s.ids.length);
  const recentStations = useRecentStations();
  const router = useRouter();

  return (
    <View className="flex-1 bg-background">
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <LargeTitle title="Settings" scrollY={scrollY} />

        {recentStations.length > 0 ? (
          <CategoryRow
            title="Recently viewed"
            subtitle="Pick up where you left off"
            stations={recentStations}
            headerAction={<ClearRecentsButton />}
          />
        ) : null}

        <View style={{ paddingHorizontal: 20, gap: 28 }}>
          <View className="flex-row items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <HugeiconsIcon icon={UserIcon} size={28} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold">Your Laba</Text>
              <Text className="mt-0.5 text-sm text-text-secondary">
                {favouriteCount} favourite{favouriteCount === 1 ? "" : "s"} saved on this device
              </Text>
            </View>
          </View>

          <Section title="Appearance" plain>
            <ThemeSegmentedControl />
          </Section>

          <Section title="Library">
            <Row
              icon={FavouriteIcon}
              tint={colors.primary}
              label="Favourites"
              value={String(favouriteCount)}
              onPress={() => router.push("/favourites")}
            />
            <Row icon={UserIcon} tint="#6366F1" label="Account" onPress={() => router.push("/account")} />
          </Section>

          <Section title="Support">
            <Row
              icon={Mail01Icon}
              tint="#0EA5E9"
              label="Contact support"
              onPress={() => Linking.openURL("mailto:ywalum@gmail.com").catch(() => {})}
            />
            <Row icon={StarIcon} tint="#F59E0B" label="Rate the app" onPress={() => void rateApp()} />
          </Section>

          <Section title="About">
            <Row icon={InformationCircleIcon} tint="#64748B" label={APP_NAME} value={`v${APP_VERSION}`} />
          </Section>

          <Text className="text-center text-xs leading-[18px] text-text-tertiary">
            Free-to-air TV and radio, with a Uganda focus and international channels.{"\n"}
            Made with care in Uganda.
          </Text>
        </View>
      </Animated.ScrollView>
      <CompactHeader title="Settings" scrollY={scrollY} hideY={hideY} right={<HeaderActions />} />
    </View>
  );
}

/** `plain` renders the children without the card container. */
function Section({ title, plain, children }: { title: string; plain?: boolean; children: ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children];
  return (
    <View>
      <Text className="mb-2 ml-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
        {title}
      </Text>
      {plain ? (
        children
      ) : (
        <View className="overflow-hidden rounded-2xl border border-border bg-surface" style={{ borderCurve: "continuous" }}>
          {items.map((child, i) => (
            <View key={i}>
              {i > 0 ? <View className="ml-[60px] h-px bg-border" /> : null}
              {child}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

interface RowProps {
  icon: IconSvg;
  tint: string;
  label: string;
  value?: string;
  onPress?: () => void;
}

/** Settings row with an iOS-style tinted icon tile and a soft pressed highlight. */
function Row({ icon, tint, label, value, onPress }: RowProps) {
  const { colors } = useTheme();
  const pressed = useSharedValue(0);

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pressed.get(), [0, 1], [colors.surface, colors.surfaceLight]),
  }));

  const content = (
    <Animated.View style={bgStyle} className="flex-row items-center gap-3 px-4 py-3">
      <View style={{ backgroundColor: tint }} className="h-8 w-8 items-center justify-center rounded-[9px]">
        <HugeiconsIcon icon={icon} size={17} color="#FFFFFF" />
      </View>
      <Text className="flex-1 text-[15px] font-medium">{label}</Text>
      {value ? <Text className="text-[15px] text-text-secondary">{value}</Text> : null}
      {onPress ? <HugeiconsIcon icon={ArrowRight01Icon} size={16} color={colors.textTertiary} /> : null}
    </Animated.View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      onPressIn={() => pressed.set(withTiming(1, { duration: 80 }))}
      onPressOut={() => pressed.set(withTiming(0, { duration: 220 }))}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {content}
    </Pressable>
  );
}

function ThemeSegmentedControl() {
  const { colors, mode } = useTheme();
  const setMode = useThemeStore((s) => s.setMode);
  const index = Math.max(0, THEME_OPTIONS.findIndex((o) => o.mode === mode));

  const width = useSharedValue(0);
  const position = useSharedValue(index);

  useEffect(() => {
    position.set(withSpring(index, spring.snappy));
  }, [index, position]);

  const indicatorStyle = useAnimatedStyle(() => {
    const seg = width.get() / THEME_OPTIONS.length;
    return { width: seg, transform: [{ translateX: position.get() * seg }] };
  });

  const onLayout = (e: LayoutChangeEvent) => width.set(e.nativeEvent.layout.width - 8);

  return (
    <View onLayout={onLayout} className="flex-row rounded-xl bg-surface-light p-1">
      <Animated.View
        style={[
          indicatorStyle,
          {
            position: "absolute",
            top: 4,
            bottom: 4,
            left: 4,
            borderRadius: 9,
            backgroundColor: colors.surfaceElevated,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          },
        ]}
      />
      {THEME_OPTIONS.map((opt) => {
        const active = opt.mode === mode;
        return (
          <Pressable
            key={opt.mode}
            onPress={() => {
              if (active) return;
              haptic.select();
              setMode(opt.mode);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${opt.label} theme`}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5"
          >
            <HugeiconsIcon icon={opt.icon} size={16} color={active ? colors.textPrimary : colors.textSecondary} />
            <Text className={active ? "text-[13px] font-semibold" : "text-[13px] font-medium text-text-secondary"}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
