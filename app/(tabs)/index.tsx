import { CategoryRow } from "@/components/CategoryRow";
import { EmptyState } from "@/components/EmptyState";
import { HeroSection, useHeroSize } from "@/components/HeroSection";
import { RefreshIndicator } from "@/components/RefreshIndicator";
import { SearchBar } from "@/components/SearchBar";
import { SkeletonCard, SkeletonHero, SkeletonTitle } from "@/components/SkeletonCard";
import { StationCard } from "@/components/StationCard";
import { GridCell, LIST_BOTTOM_PADDING } from "@/components/StationList";
import { CompactHeader, LargeTitle, useCollapsingHeader } from "@/components/ui/CollapsingHeader";
import { IconButton } from "@/components/ui/IconButton";
import { ShimmerGroup } from "@/components/ui/Shimmer";
import { Text } from "@/components/ui/Text";
import { duration } from "@/lib/motion";
import { matchesQuery } from "@/lib/search";
import { selectHeroStations } from "@/lib/selectHeroStations";
import { useDebounce } from "@/lib/useDebounce";
import { useTheme } from "@/lib/useTheme";
import { useStationStore } from "@/stores/useStationStore";
import { UserIcon } from "@hugeicons/core-free-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { RefreshControl, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";

const ROW_LIMIT = 12;
const SEARCH_LIMIT = 40;

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { cardWidth, cardHeight } = useHeroSize();
  const { scrollY, onScroll } = useCollapsingHeader();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 200);
  const isSearching = debouncedQuery.trim().length > 0;

  const {
    stations,
    isLoading,
    isRefreshing,
    refreshStations,
    tvStations,
    radioStations,
    internationalStations,
    featuredStations,
  } = useStationStore(
    useShallow((s) => ({
      stations: s.stations,
      isLoading: s.isLoading,
      isRefreshing: s.isRefreshing,
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

  const searchResults = useMemo(
    () =>
      isSearching
        ? stations.filter((s) => matchesQuery(s, debouncedQuery)).slice(0, SEARCH_LIMIT)
        : [],
    [stations, debouncedQuery, isSearching],
  );

  const showSkeleton = isLoading && stations.length === 0;

  const profileButton = (
    <IconButton
      icon={UserIcon}
      onPress={() => router.push("/settings")}
      accessibilityLabel="Open settings"
      iconSize={18}
    />
  );

  return (
    <View className="flex-1 bg-background">
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshStations}
            tintColor={colors.primary}
            colors={[colors.primary]}
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

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Channels, stations, genres"
          className="mb-6"
        />

        {showSkeleton ? (
          <ShimmerGroup>
            <SkeletonHero width={cardWidth} height={cardHeight} />
            <View className="mt-10 gap-3">
              <SkeletonTitle />
              <View className="flex-row gap-3 px-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <View key={i} style={{ width: 150 }}>
                    <SkeletonCard />
                  </View>
                ))}
              </View>
            </View>
          </ShimmerGroup>
        ) : isSearching ? (
          <Animated.View
            key="results"
            entering={FadeIn.duration(duration.base)}
            exiting={FadeOut.duration(duration.fast)}
          >
            <Text className="mb-3 px-5 text-[13px] font-semibold uppercase tracking-widest text-text-secondary">
              {searchResults.length === 0
                ? "No matches"
                : `${searchResults.length}${searchResults.length === SEARCH_LIMIT ? "+" : ""} result${searchResults.length === 1 ? "" : "s"}`}
            </Text>
            {searchResults.length === 0 ? (
              <EmptyState message={`Nothing matches "${debouncedQuery.trim()}". Try a genre like news or music.`} />
            ) : (
              <View className="flex-row flex-wrap">
                {searchResults.map((s, i) => (
                  <View key={s.id} style={{ width: "50%" }}>
                    <GridCell index={i}>
                      <StationCard station={s} />
                    </GridCell>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
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
      <CompactHeader title="Laba" scrollY={scrollY} right={profileButton} />
    </View>
  );
}
