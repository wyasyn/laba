import { CategoryRow } from "@/components/CategoryRow";
import { HeaderActions } from "@/components/HeaderActions";
import { HeroSection, useHeroSize } from "@/components/HeroSection";
import { RefreshIndicator } from "@/components/RefreshIndicator";
import { SkeletonCard, SkeletonHero, SkeletonTitle } from "@/components/SkeletonCard";
import { LIST_BOTTOM_PADDING } from "@/components/StationList";
import { CompactHeader, LargeTitle, useCollapsingHeader } from "@/components/ui/CollapsingHeader";
import { ShimmerGroup } from "@/components/ui/Shimmer";
import { duration } from "@/lib/motion";
import { selectHeroStations } from "@/lib/selectHeroStations";
import { useStationStore } from "@/stores/useStationStore";
import { useMemo } from "react";
import { RefreshControl, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";

const ROW_LIMIT = 12;

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { cardWidth, cardHeight } = useHeroSize();
  const { scrollY, onScroll } = useCollapsingHeader();

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


  return (
    <View className="flex-1 bg-background">
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
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
        <LargeTitle
          title={greeting()}
          subtitle="What are we tuning into?"
          scrollY={scrollY}
          accessory={<RefreshIndicator />}
        />

        {showSkeleton ? (
          <ShimmerGroup>
            <SkeletonHero width={cardWidth} height={cardHeight} />
            <View className="mt-10 gap-3">
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
            {heroStations.length > 0 ? <HeroSection featuredStations={heroStations} /> : null}
            <CategoryRow
              index={0}
              title="Live TV"
              subtitle="Popular channels right now"
              stations={tvStations.slice(0, ROW_LIMIT)}
              seeAllHref="/tv"
            />
            <CategoryRow
              index={1}
              title="Radio"
              subtitle="Tune in, wherever you are"
              stations={radioStations.slice(0, ROW_LIMIT)}
              seeAllHref="/radio"
            />
            {internationalStations.length > 0 ? (
              <CategoryRow
                index={2}
                title="International"
                subtitle="News and more from around the world"
                stations={internationalStations.slice(0, ROW_LIMIT)}
              />
            ) : null}
          </Animated.View>
        )}
      </Animated.ScrollView>
      <CompactHeader title="Laba" scrollY={scrollY} right={<HeaderActions />} />
    </View>
  );
}
