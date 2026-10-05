import { CategoryRow } from "@/components/CategoryRow";
import { HeaderActions } from "@/components/HeaderActions";
import { LIST_BOTTOM_PADDING } from "@/components/StationList";
import { COMPACT_BAR_HEIGHT, CompactHeader, LargeTitle, useCollapsingHeader } from "@/components/ui/CollapsingHeader";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { LanguageSheet } from "@/components/LanguageSheet";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { LANGUAGE_NAMES, t as translateNow, useT, type MessageKey } from "@/lib/i18n";
import { haptic, spring } from "@/lib/motion";
import type { Station } from "@/lib/schemas";
import { useTheme } from "@/lib/useTheme";
import { useHideTabBarOnScroll } from "@/stores/useChromeStore";
import { useFavouritesStore } from "@/stores/useFavouritesStore";
import { useRecentsStore } from "@/stores/useRecentsStore";
import { useStationStore } from "@/stores/useStationStore";
import { useLocaleStore } from "@/stores/useLocaleStore";
import { useThemeStore, type ThemeMode } from "@/stores/useThemeStore";
import {
  ArrowRight01Icon,
  FavouriteIcon,
  InformationCircleIcon,
  LanguageCircleIcon,
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
import { useEffect, useMemo, useState, type ReactNode } from "react";
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

const THEME_OPTIONS: { mode: ThemeMode; label: MessageKey; icon: IconSvg }[] = [
  { mode: "light", label: "settings.themeLight", icon: Sun03Icon },
  { mode: "dark", label: "settings.themeDark", icon: Moon02Icon },
  { mode: "system", label: "settings.themeAuto", icon: SmartPhone01Icon },
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
  Alert.alert(translateNow("settings.clearConfirmTitle"), translateNow("settings.clearConfirmMessage"), [
    { text: translateNow("common.cancel"), style: "cancel" },
    {
      text: translateNow("settings.clear"),
      style: "destructive",
      onPress: () => {
        haptic.tap();
        useRecentsStore.getState().clear();
      },
    },
  ]);
}

function ClearRecentsButton() {
  const { t } = useT();
  return (
    <PressableScale
      onPress={confirmClearRecents}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={t("settings.clearLabel")}
      className="rounded-full bg-surface-light px-3 py-1.5"
    >
      <Text className="text-[13px] font-semibold text-text-secondary">{t("settings.clear")}</Text>
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
  const { t, plural, locale } = useT();
  const languagePreference = useLocaleStore((s) => s.preference);
  const [languageOpen, setLanguageOpen] = useState(false);

  return (
    <View className="flex-1 bg-background">
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <LargeTitle title={t("settings.title")} scrollY={scrollY} />

        {recentStations.length > 0 ? (
          <CategoryRow
            title={t("settings.recent")}
            subtitle={t("settings.recentSubtitle")}
            stations={recentStations}
            headerAction={<ClearRecentsButton />}
          />
        ) : null}

        {/* Capped and centred so rows stay readable on tablets. */}
        <View style={{ paddingHorizontal: 20, gap: 28, width: "100%", maxWidth: 680, alignSelf: "center" }}>
          <View className="flex-row items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <HugeiconsIcon icon={UserIcon} size={28} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold">{t("settings.yourLaba")}</Text>
              <Text className="mt-0.5 text-sm text-text-secondary">
                {plural("settings.favouritesSaved", favouriteCount)}
              </Text>
            </View>
          </View>

          <Section title={t("settings.appearance")} plain>
            <ThemeSegmentedControl />
          </Section>

          <Section title={t("settings.language")}>
            <Row
              icon={LanguageCircleIcon}
              tint="#10B981"
              label={t("settings.language")}
              value={languagePreference === "system" ? t("settings.languageSystem") : LANGUAGE_NAMES[locale]}
              onPress={() => setLanguageOpen(true)}
            />
          </Section>

          <Section title={t("settings.library")}>
            <Row
              icon={FavouriteIcon}
              tint={colors.primary}
              label={t("settings.favourites")}
              value={String(favouriteCount)}
              onPress={() => router.push("/favourites")}
            />
          </Section>

          <Section title={t("settings.support")}>
            <Row
              icon={Mail01Icon}
              tint="#0EA5E9"
              label={t("settings.contact")}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})}
            />
            <Row icon={StarIcon} tint="#F59E0B" label={t("settings.rate")} onPress={() => void rateApp()} />
          </Section>

          <Section title={t("settings.about")}>
            <Row icon={InformationCircleIcon} tint="#64748B" label={APP_NAME} value={`v${APP_VERSION}`} />
          </Section>

          <Text className="text-center text-xs leading-[18px] text-text-tertiary">
            {t("settings.tagline")}
          </Text>
        </View>
      </Animated.ScrollView>
      <CompactHeader title={t("settings.title")} scrollY={scrollY} hideY={hideY} right={<HeaderActions />} />
      <LanguageSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} />
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
  const { t } = useT();
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
            accessibilityLabel={t("settings.themeLabel", { label: t(opt.label) })}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5"
          >
            <HugeiconsIcon icon={opt.icon} size={16} color={active ? colors.textPrimary : colors.textSecondary} />
            <Text className={active ? "text-[13px] font-semibold" : "text-[13px] font-medium text-text-secondary"}>
              {t(opt.label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
