import { CompactHeader, COMPACT_BAR_HEIGHT, LargeTitle, useCollapsingHeader } from "@/components/ui/CollapsingHeader";
import { FilterChips, FILTER_CHIPS_HEIGHT } from "@/components/ui/FilterChips";
import { GlassView } from "@/components/ui/GlassView";
import { ShimmerGroup } from "@/components/ui/Shimmer";
import type { Station, StationType } from "@/lib/schemas";
import { hasCategory, matchesFilters, topCategories, type StationFilters } from "@/lib/search";
import { useHideTabBarOnScroll } from "@/stores/useChromeStore";
import { useStationStore } from "@/stores/useStationStore";
import { FlashList, type FlashListRef, type ListRenderItemInfo } from "@shopify/flash-list";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { RefreshControl, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "./EmptyState";
import { HeaderActions } from "./HeaderActions";
import { RefreshIndicator } from "./RefreshIndicator";
import { SkeletonCard } from "./SkeletonCard";
import { NO_FILTERS, StationFilterButton } from "./StationFilterButton";
import { StationCard } from "./StationCard";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList<Station>);

interface StationListProps {
  type: StationType;
  title: string;
  subtitle: string;
}

/** Bottom padding so the last row clears the tab bar and the mini-player. */
export const LIST_BOTTOM_PADDING = 180;

/** Vertical room for the category rail, including its breathing space. */
const TABS_SLOT = FILTER_CHIPS_HEIGHT + 20;

/**
 * Grid key. Includes the column because GridCell pads by column, and FlashList
 * doesn't re-render a recycled cell when filtering only moves its item: a
 * station that changes column has to get a fresh cell.
 */
export function gridKeyExtractor(item: Station, index: number) {
  return `${item.id}:${index % 2}`;
}

/** Two-column cell with even gutters (20 outside, 14 between). */
export function GridCell({ index, children }: { index: number; children: ReactNode }) {
  const left = index % 2 === 0;
  return (
    <View style={{ paddingLeft: left ? 20 : 7, paddingRight: left ? 7 : 20, paddingBottom: 16 }}>
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
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlashListRef<Station>>(null);

  const isLoading = useStationStore((s) => s.isLoading);
  const refreshStations = useStationStore((s) => s.refreshStations);
  const sourceStations = useStationStore((s) => (type === "tv" ? s.tvStations : s.radioStations));

  const [category, setCategory] = useState<string | null>(null);
  const [filters, setFilters] = useState<StationFilters>(NO_FILTERS);

  // Where the rail sits in the scroll content, and where it pins on screen.
  const [tabsY, setTabsY] = useState(0);
  const tabsYValue = useSharedValue(0);
  const pinnedTop = insets.top + COMPACT_BAR_HEIGHT;

  const categories = useMemo(() => topCategories(sourceStations), [sourceStations]);

  const stations = useMemo(
    () =>
      sourceStations.filter(
        (s) => (category === null || hasCategory(s, category)) && matchesFilters(s, filters),
      ),
    [sourceStations, category, filters],
  );

  const showSkeleton = isLoading && sourceStations.length === 0;
  const hasTabs = sourceStations.length > 0;

  // Scrolling down slides the bar, the category rail and the tab bar away so
  // the grid gets the whole screen; scrolling up brings them back.
  const hideDistance = COMPACT_BAR_HEIGHT + (hasTabs ? TABS_SLOT : 0);
  const { scrollY, hideY, onScroll } = useCollapsingHeader({ hideDistance });
  useHideTabBarOnScroll(hideY, hideDistance);

  const scrollToResults = () => {
    // If the rail is pinned, bring the top of the new results to just under it
    // instead of leaving the viewport wherever the old list happened to be.
    const pinOffset = tabsY - pinnedTop;
    hideY.set(0);
    if (scrollY.get() > pinOffset) {
      listRef.current?.scrollToOffset({ offset: pinOffset, animated: false });
    }
  };

  const selectCategory = (next: string | null) => {
    setCategory(next);
    scrollToResults();
  };

  const changeFilters = (next: StationFilters) => {
    setFilters(next);
    scrollToResults();
  };

  const onTabsSlotLayout = (e: LayoutChangeEvent) => {
    const y = e.nativeEvent.layout.y;
    setTabsY(y);
    tabsYValue.set(y);
  };

  const tabsStyle = useAnimatedStyle(() => {
    const y = tabsYValue.get();
    return {
      opacity: y > 0 ? 1 : 0,
      transform: [{ translateY: Math.max(y - scrollY.get(), pinnedTop - hideY.get()) }],
    };
  });

  const tabsBackdropStyle = useAnimatedStyle(() => {
    const distance = tabsYValue.get() - scrollY.get() - (pinnedTop - hideY.get());
    return { opacity: interpolate(distance, [12, 0], [0, 1], Extrapolation.CLAMP) };
  });

  const header = (
    <View>
      <LargeTitle
        title={title}
        subtitle={subtitle}
        scrollY={scrollY}
        accessory={<RefreshIndicator />}
      />
      {/* The real rail floats above the list (so it can pin); this reserves its room. */}
      {hasTabs ? <View onLayout={onTabsSlotLayout} style={{ height: TABS_SLOT }} /> : <View className="h-4" />}
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
        ref={listRef}
        data={showSkeleton ? [] : stations}
        keyExtractor={gridKeyExtractor}
        numColumns={2}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={showSkeleton ? null : <EmptyState />}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        // FlashList v2 anchors the first visible item by default, which made the
        // list jump mid-way when a filter put items back in front of it.
        maintainVisibleContentPosition={{ disabled: true }}
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            // The pull only triggers the refresh. The "Updating" pill in the header is the
            // single loading state, so the native spinner is released straight away.
            refreshing={false}
            onRefresh={refreshStations}
            tintColor="transparent"
            colors={["transparent"]}
            progressBackgroundColor="transparent"
            progressViewOffset={insets.top + COMPACT_BAR_HEIGHT}
          />
        }
      />

      {hasTabs ? (
        <Animated.View pointerEvents="box-none" style={[styles.tabs, tabsStyle]}>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, tabsBackdropStyle]}>
            <GlassView style={StyleSheet.absoluteFill} intensity={60} />
            <View className="absolute bottom-0 left-0 right-0 h-px bg-border" />
          </Animated.View>
          <View style={styles.tabsInner}>
            <FilterChips
              options={categories}
              selected={category}
              onSelect={selectCategory}
              trailing={
                <StationFilterButton stations={sourceStations} value={filters} onChange={changeFilters} />
              }
            />
          </View>
        </Animated.View>
      ) : null}

      <CompactHeader
        title={title}
        scrollY={scrollY}
        divider={!hasTabs}
        hideY={hideY}
        right={<HeaderActions />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: TABS_SLOT,
  },
  tabsInner: {
    flex: 1,
    justifyContent: "center",
  },
});
