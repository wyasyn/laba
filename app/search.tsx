import { EmptyState } from "@/components/EmptyState";
import { SearchBar } from "@/components/SearchBar";
import { NO_FILTERS, StationFilterButton } from "@/components/StationFilterButton";
import { useStationGrid } from "@/components/StationList";
import { FilterChips } from "@/components/ui/FilterChips";
import { IconButton } from "@/components/ui/IconButton";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { useT } from "@/lib/i18n";
import { duration, haptic } from "@/lib/motion";
import type { StationType } from "@/lib/schemas";
import { matchesFilters, matchesQuery, topCategories, type StationFilters } from "@/lib/search";
import { useDebounce } from "@/lib/useDebounce";
import { useStationStore } from "@/stores/useStationStore";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TYPES: StationType[] = ["tv", "radio"];

/** Search across both TV and radio, with an optional type filter. */
export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { columns, keyExtractor, renderItem } = useStationGrid();
  const stations = useStationStore((s) => s.stations);
  const { t } = useT();
  const typeLabels: Record<string, string> = { tv: t("tabs.tv"), radio: t("tabs.radio") };

  const [query, setQuery] = useState("");
  const [type, setType] = useState<StationType | null>(null);
  const [filters, setFilters] = useState<StationFilters>(NO_FILTERS);
  const debouncedQuery = useDebounce(query, 200);
  const isSearching = debouncedQuery.trim().length > 0;

  const suggestions = useMemo(() => topCategories(stations, 10), [stations]);

  const matched = useMemo(
    () =>
      isSearching
        ? stations.filter((s) => matchesQuery(s, debouncedQuery) && matchesFilters(s, filters))
        : [],
    [stations, debouncedQuery, isSearching, filters],
  );

  const counts = useMemo(() => {
    const out: Record<string, number> = { "": matched.length };
    for (const t of TYPES) out[t] = matched.filter((s) => s.type === t).length;
    return out;
  }, [matched]);

  const results = useMemo(
    () => (type === null ? matched : matched.filter((s) => s.type === type)),
    [matched, type],
  );

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 4 }} className="flex-row items-center gap-3 px-4 pb-3">
        <IconButton icon={ArrowLeft01Icon} onPress={() => router.back()} accessibilityLabel={t("common.goBack")} />
        <SearchBar
          compact
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder={t("search.placeholder")}
          className="mx-0 flex-1"
        />
      </View>

      {isSearching ? (
        <>
          <View className="pb-3">
            <FilterChips
              options={TYPES}
              labels={typeLabels}
              allLabel={t("filters.all")}
              selected={type}
              onSelect={(next) => setType(next as StationType | null)}
              counts={counts}
              trailing={<StationFilterButton stations={stations} value={filters} onChange={setFilters} />}
            />
          </View>
          <FlashList
            data={results}
            key={columns}
            keyExtractor={keyExtractor}
            numColumns={columns}
            renderItem={renderItem}
            ListEmptyComponent={
              <EmptyState message={t("search.noMatch", { query: debouncedQuery.trim() })} />
            }
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            maintainVisibleContentPosition={{ disabled: true }}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 24 }}
          />
        </>
      ) : (
        <Animated.View entering={FadeIn.duration(duration.base)} className="px-5 pt-4">
          <Text className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-text-tertiary">
            {t("search.browseByGenre")}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {suggestions.map((c) => (
              <PressableScale
                key={c}
                onPress={() => {
                  haptic.select();
                  setQuery(c);
                }}
                accessibilityRole="button"
                accessibilityLabel={t("search.searchFor", { term: c })}
                className="rounded-full border border-border bg-surface px-4 py-2"
              >
                <Text className="text-[14px] font-medium capitalize">{c}</Text>
              </PressableScale>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
}
