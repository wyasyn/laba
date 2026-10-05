import { BackupInvite } from "@/components/BackupInvite";
import { CategoryRow } from "@/components/CategoryRow";
import { HeaderActions } from "@/components/HeaderActions";
import { HomeHero, useHomeHeroHeight } from "@/components/HomeHero";
import { RefreshIndicator } from "@/components/RefreshIndicator";
import { SkeletonCard, SkeletonHero, SkeletonTitle } from "@/components/SkeletonCard";
import { LIST_BOTTOM_PADDING } from "@/components/StationList";
import { COMPACT_BAR_HEIGHT, CompactHeader, useCollapsingHeader } from "@/components/ui/CollapsingHeader";
import { ShimmerGroup } from "@/components/ui/Shimmer";
import { Text } from "@/components/ui/Text";
import { useT } from "@/lib/i18n";
import { duration } from "@/lib/motion";
import { mixInternational, rankFeatured } from "@/lib/homeSections";
import { personalRows } from "@/lib/taste";
import { useTheme } from "@/lib/useTheme";
import { useHideTabBarOnScroll } from "@/stores/useChromeStore";
import { useFavouritesStore } from "@/stores/useFavouritesStore";
import { useStationStore } from "@/stores/useStationStore";
import { useTasteStore } from "@/stores/useTasteStore";
import { useFocusEffect, useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, View } from "react-native";
import Animated, { FadeIn, FadeOut, useAnimatedReaction } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { useShallow } from "zustand/react/shallow";

/** Home rows show a taste of each list; the full list is one tap away. */
const ROW_LIMIT = 12;

/** Rows learned from what this person plays. All empty for a new user. */
function usePersonalRows() {
  const stations = useStationStore((s) => s.stations);
  const profile = useTasteStore((s) => s.profile);
  const favourites = useFavouritesStore((s) => s.ids);
  // The tab stays mounted, so the clock is re-read on every visit to keep the
  // time-of-day order fresh.
  const [now, setNow] = useState(Date.now);
  useFocusEffect(useCallback(() => setNow(Date.now()), []));
  return useMemo(
    () => personalRows(stations, profile, favourites, now, ROW_LIMIT),
    [stations, profile, favourites, now],
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const heroHeight = useHomeHeroHeight();
  const light = useTheme().resolved === "light";
  const isFocused = useIsFocused();

  const {
    stations,
    isLoading,
    refreshStations,
    tvStations,
    radioStations,
    internationalStations,
    featuredStations,
  } = useStationStore(
    useShallow((s) => ({
      stations: s.stations,
      isLoading: s.isLoading,
      refreshStations: s.refreshStations,
      tvStations: s.tvStations,
      radioStations: s.radioStations,
      internationalStations: s.internationalStations,
      featuredStations: s.featuredStations,
    })),
  );

  const featuredRow = useMemo(() => rankFeatured(featuredStations, ROW_LIMIT), [featuredStations]);
  const worldStations = useMemo(() => mixInternational(internationalStations, ROW_LIMIT), [internationalStations]);
  const personal = usePersonalRows();

  const showSkeleton = isLoading && stations.length === 0;

  // The frosted bar fades in as the hero's bottom edge reaches it.
  const barBottom = insets.top + COMPACT_BAR_HEIGHT;
  const handoff: [number, number] = [heroHeight - barBottom - 80, heroHeight - barBottom];

  // Once past the hero, scrolling down slides the bar and the tab bar away;
  // scrolling up brings them back.
  const { scrollY, hideY, onScroll } = useCollapsingHeader({
    hideDistance: COMPACT_BAR_HEIGHT,
    hideAfter: handoff[1],
  });
  useHideTabBarOnScroll(hideY, COMPACT_BAR_HEIGHT);

  // While the bar is still clear the page top is the (dark) hero, so the
  // status bar and header buttons switch to their light-on-image style. In
  // light mode the hero's lower half fades to white, so that ends once it
  // reaches the top of the screen.
  const [overHero, setOverHero] = useState(true);
  const threshold = light ? heroHeight * 0.45 : (handoff[0] + handoff[1]) / 2;
  useAnimatedReaction(
    () => scrollY.get() < threshold,
    (next, prev) => {
      if (next !== prev) scheduleOnRN(setOverHero, next);
    },
    [threshold],
  );

  return (
    <View className="flex-1 bg-background">
      {isFocused && overHero ? <StatusBar style="light" /> : null}
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
        refreshControl={
          <RefreshControl
            // The pull only triggers the refresh. The "Updating" pill in the header is the
            // single loading state, so the native spinner is released straight away.
            refreshing={false}
            onRefresh={refreshStations}
            tintColor="transparent"
            colors={["transparent"]}
            progressBackgroundColor="transparent"
            progressViewOffset={insets.top + 48}
          />
        }
      >
        {showSkeleton ? (
          <ShimmerGroup>
            <SkeletonHero height={heroHeight} />
            <View className="mt-8 gap-3">
              <SkeletonTitle />
              <View className="flex-row gap-3 px-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <View key={i} style={{ width: 148 }}>
                    <SkeletonCard />
                  </View>
                ))}
              </View>
            </View>
          </ShimmerGroup>
        ) : (
          <Animated.View
            key="browse"
            entering={FadeIn.duration(duration.base)}
            exiting={FadeOut.duration(duration.fast)}
          >
            <HomeHero
              tvStations={tvStations}
              radioStations={radioStations}
              featuredStations={featuredStations}
              active={isFocused}
              scrollY={scrollY}
              header={
                <View
                  pointerEvents="box-none"
                  style={{ paddingTop: insets.top, height: barBottom }}
                  className="flex-row items-center px-5"
                >
                  <Text className="text-[28px] font-bold tracking-tighter text-white">Laba</Text>
                </View>
              }
            />
            <View className="mt-6">
              <CategoryRow index={0} title={t("home.jumpBackIn")} headerVariant="inline" stations={personal.jumpBackIn} />
              <BackupInvite hasHistory={personal.jumpBackIn.length > 0} />
              <CategoryRow index={1} title={t("home.forYou")} headerVariant="inline" stations={personal.forYou} />
              {personal.topCategory ? (
                <CategoryRow
                  index={2}
                  title={t("home.becauseYouLike", {
                    category: personal.topCategory.name.charAt(0).toUpperCase() + personal.topCategory.name.slice(1),
                  })}
                  headerVariant="inline"
                  stations={personal.topCategory.stations}
                />
              ) : null}
              <CategoryRow index={3} title={t("home.featured")} headerVariant="inline" stations={featuredRow} />
            </View>
            <CategoryRow index={4} title={t("home.world")} headerVariant="inline" stations={worldStations} />
          </Animated.View>
        )}
      </Animated.ScrollView>
      <CompactHeader
        title={t("home.title")}
        scrollY={scrollY}
        handoff={handoff}
        hideY={hideY}
        right={
          <>
            <RefreshIndicator />
            <HeaderActions variant={overHero && !showSkeleton ? "glass" : "surface"} />
          </>
        }
      />
    </View>
  );
}
