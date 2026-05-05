import type { Station, StationType } from "@/lib/schemas";
import { useDebounce } from "@/lib/useDebounce";
import { useStationStore } from "@/stores/useStationStore";
import { ReactElement, useCallback, useMemo, useRef, useState } from "react";
import { FlatList, TextInput, View } from "react-native";
import { EmptyState } from "./EmptyState";
import { SearchBar } from "./SearchBar";
import { SkeletonRowCard } from "./SkeletonCard";
import { StationCard } from "./StationCard";

interface StationListProps {
  header: ReactElement;
  type: StationType;
}

const COLUMN_WRAPPER_STYLE = {
  justifyContent: "space-between",
  paddingHorizontal: 16,
  marginBottom: 10,
} as const;

const CONTENT_CONTAINER_STYLE = { paddingBottom: 20 } as const;

export function StationList({ type, header }: StationListProps) {
  const isLoading = useStationStore((s) => s.isLoading);
  const isRefreshing = useStationStore((s) => s.isRefreshing);
  const refreshStations = useStationStore((s) => s.refreshStations);
  const sourceStations = useStationStore((s) =>
    type === "tv" ? s.tvStations : s.radioStations,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 250);
  const searchRef = useRef<TextInput>(null);

  const stations = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return sourceStations;
    return sourceStations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.categories.some((c) => c.toLowerCase().includes(q)),
    );
  }, [sourceStations, debouncedQuery]);

  const keyExtractor = useCallback((item: Station) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: Station }) => (
      <View className="w-[48%]">
        <StationCard station={item} />
      </View>
    ),
    [],
  );

  const placeholder = useMemo(
    () => `Search ${type === "tv" ? "TV" : "radio"} stations...`,
    [type],
  );

  const listHeader = useMemo(() => <View>{header}</View>, [header]);

  if (isLoading && stations.length === 0) {
    return (
      <View className="flex-1 bg-background">
        {header}
        <SearchBar
          ref={searchRef}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={placeholder}
          variant="pill"
        />
        <View className="flex-row flex-wrap justify-between px-4 pt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} className="w-[48%]">
              <SkeletonRowCard />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={stations}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={COLUMN_WRAPPER_STYLE}
        renderItem={renderItem}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
        ListHeaderComponent={
          <>
            {listHeader}
            <SearchBar
              ref={searchRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={placeholder}
              variant="pill"
            />
            <View className="h-2" />
          </>
        }
        ListEmptyComponent={<EmptyState />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={CONTENT_CONTAINER_STYLE}
        refreshing={isRefreshing}
        onRefresh={refreshStations}
      />
    </View>
  );
}
