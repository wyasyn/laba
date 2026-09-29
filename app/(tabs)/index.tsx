import { HeaderActions } from "@/components/HeaderActions";
import { HomeHero, useHomeHeroHeight } from "@/components/HomeHero";
import { RefreshIndicator } from "@/components/RefreshIndicator";
import { SkeletonCard, SkeletonHero, SkeletonTitle } from "@/components/SkeletonCard";
import { StationCard } from "@/components/StationCard";
import { GridCell, LIST_BOTTOM_PADDING } from "@/components/StationList";
import { COMPACT_BAR_HEIGHT, CompactHeader, useCollapsingHeader } from "@/components/ui/CollapsingHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ShimmerGroup } from "@/components/ui/Shimmer";
import { Text } from "@/components/ui/Text";
import { duration, enterFromBelow } from "@/lib/motion";
import { selectHeroStations } from "@/lib/selectHeroStations";
import { useStationStore } from "@/stores/useStationStore";
import { useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { RefreshControl, View } from "react-native";
import Animated, { FadeIn, FadeOut, useAnimatedReaction } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { useShallow } from "zustand/react/shallow";

/** Home shows a taste of each list; the full list is one tap away. */
const ROW_LIMIT = 6;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const heroHeight = useHomeHeroHeight();
  const { scrollY, onScroll } = useCollapsingHeader();
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

  const heroStations = useMemo(
    () => selectHeroStations(featuredStations, stations),
    [featuredStations, stations],
  );

  const showSkeleton = isLoading && stations.length === 0;

  // The frosted bar fades in as the hero's bottom edge reaches it.
  const barBottom = insets.top + COMPACT_BAR_HEIGHT;
  const handoff: [number, number] = [heroHeight - barBottom - 80, heroHeight - barBottom];

  // While the bar is still clear the page top is the (dark) hero, so the
  // status bar and header buttons switch to their light-on-image style.
  const [overHero, setOverHero] = useState(true);
  const threshold = (handoff[0] + handoff[1]) / 2;
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
              featuredStations={heroStations}
              active={isFocused}
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
            {internationalStations.length > 0 ? (
              // Same two-column cards as the TV and Radio tabs.
              <Animated.View entering={enterFromBelow(0)} className="mt-6">
                <SectionHeader title="Around the world" variant="inline" />
                <View className="mt-3 flex-row flex-wrap">
                  {internationalStations.slice(0, ROW_LIMIT).map((station, i) => (
                    <View key={station.id} style={{ width: "50%" }}>
                      <GridCell index={i}>
                        <StationCard station={station} />
                      </GridCell>
                    </View>
                  ))}
                </View>
              </Animated.View>
            ) : null}
          </Animated.View>
        )}
      </Animated.ScrollView>
      <CompactHeader
        title="Home"
        scrollY={scrollY}
        handoff={handoff}
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
