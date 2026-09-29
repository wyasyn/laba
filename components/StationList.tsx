import { CompactHeader, COMPACT_BAR_HEIGHT, LargeTitle, useCollapsingHeader } from "@/components/ui/CollapsingHeader";
import { FilterChips } from "@/components/ui/FilterChips";
import { ShimmerGroup } from "@/components/ui/Shimmer";
import type { Station, StationType } from "@/lib/schemas";
import { hasCategory, matchesQuery, topCategories } from "@/lib/search";
import { useDebounce } from "@/lib/useDebounce";
import { useTheme } from "@/lib/useTheme";
import { useStationStore } from "@/stores/useStationStore";
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import { useMemo, useState, type ReactNode } from "react";
import { RefreshControl, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "./EmptyState";
import { RefreshIndicator } from "./RefreshIndicator";
import { SearchBar } from "./SearchBar";
import { SkeletonCard } from "./SkeletonCard";
import { StationCard } from "./StationCard";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList<Station>);

interface StationListProps {
  type: StationType;
  title: string;
  subtitle: string;
}

/** Bottom padding so the last row clears the tab bar and the mini-player. */
export const LIST_BOTTOM_PADDING = 180;

function keyExtractor(item: Station) {
  return item.id;
}

/** Two-column cell with even gutters (20 outside, 12 between). */
export function GridCell({ index, children }: { index: number; children: ReactNode }) {
  const left = index % 2 === 0;
  return (
    <View style={{ paddingLeft: left ? 20 : 6, paddingRight: left ? 6 : 20, paddingBottom: 12 }}>
      {children}
    </View>
  );
}

function renderItem({ item, index }: ListRenderItemInfo<Station>) {
  return (
    <GridCell index={index}>
      <StationCard station={item} />
    </GridCell>
  );
}

export function StationList({ type, title, subtitle }: StationListProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { scrollY, onScroll } = useCollapsingHeader();

  const isLoading = useStationStore((s) => s.isLoading);
  const isRefreshing = useStationStore((s) => s.isRefreshing);
  const refreshStations = useStationStore((s) => s.refreshStations);
  const sourceStations = useStationStore((s) => (type === "tv" ? s.tvStations : s.radioStations));

  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const debouncedQuery = useDebounce(searchQuery, 200);

  const categories = useMemo(() => topCategories(sourceStations), [sourceStations]);

  const stations = useMemo(
    () =>
      sourceStations.filter(
        (s) => matchesQuery(s, debouncedQuery) && (category === null || hasCategory(s, category)),
      ),
    [sourceStations, debouncedQuery, category],
  );

  const showSkeleton = isLoading && sourceStations.length === 0;

  const header = (
    <View>
      <LargeTitle
        title={title}
        subtitle={subtitle}
        scrollY={scrollY}
        accessory={<RefreshIndicator />}
      />
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={`Search ${type === "tv" ? "TV channels" : "radio stations"}`}
      />
      <View className="pb-4 pt-3">
        <FilterChips options={categories} selected={category} onSelect={setCategory} />
      </View>
      {showSkeleton ? (
        <ShimmerGroup>
          <View className="flex-row flex-wrap">
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={{ width: "50%" }}>
                <GridCell index={i}>
                  <SkeletonCard />
                </GridCell>
              </View>
            ))}
          </View>
        </ShimmerGroup>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <AnimatedFlashList
        data={showSkeleton ? [] : stations}
        keyExtractor={keyExtractor}
        numColumns={2}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={showSkeleton ? null : <EmptyState />}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshStations}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressViewOffset={insets.top + COMPACT_BAR_HEIGHT}
          />
        }
      />
      <CompactHeader title={title} scrollY={scrollY} />
    </View>
  );
}
