import { CategoryRow } from "@/components/CategoryRow";
import { HeroSection } from "@/components/HeroSection";
import { RefreshIndicator } from "@/components/RefreshIndicator";
import { SearchBar } from "@/components/SearchBar";
import { SkeletonRowCard } from "@/components/SkeletonCard";
import type { Station } from "@/lib/schemas";
import { selectHeroStations } from "@/lib/selectHeroStations";
import { useDebounce } from "@/lib/useDebounce";
import { useTheme } from "@/lib/useTheme";
import { useStationStore } from "@/stores/useStationStore";
import { useUser } from "@clerk/expo";
import { UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";

const SCROLL_CONTENT_STYLE = { paddingBottom: 28 } as const;

function matchesQuery(s: Station, q: string) {
  const t = q.toLowerCase().trim();
  if (!t) return true;
  return (
    s.name.toLowerCase().includes(t) ||
    s.description.toLowerCase().includes(t) ||
    s.categories.some((c) => c.toLowerCase().includes(t))
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 250);

  const {
    stations,
    isLoading,
    tvStations,
    radioStations,
    internationalStations,
    featuredStations,
  } = useStationStore(
    useShallow((s) => ({
      stations: s.stations,
      isLoading: s.isLoading,
      tvStations: s.tvStations,
      radioStations: s.radioStations,
      internationalStations: s.internationalStations,
      featuredStations: s.featuredStations,
    })),
  );

  const hasInternational = internationalStations.length > 0;

  const filteredFeatured = useMemo(
    () => featuredStations.filter((s) => matchesQuery(s, debouncedQuery)),
    [featuredStations, debouncedQuery],
  );

  const stationsMatchingSearch = useMemo(
    () => stations.filter((s) => matchesQuery(s, debouncedQuery)),
    [stations, debouncedQuery],
  );

  const heroStations = useMemo(
    () => selectHeroStations(filteredFeatured, stationsMatchingSearch),
    [filteredFeatured, stationsMatchingSearch],
  );

  const tvRow = useMemo(
    () => tvStations.filter((s) => matchesQuery(s, debouncedQuery)).slice(0, 10),
    [tvStations, debouncedQuery],
  );

  const radioRow = useMemo(
    () => radioStations.filter((s) => matchesQuery(s, debouncedQuery)).slice(0, 10),
    [radioStations, debouncedQuery],
  );

  const internationalRow = useMemo(
    () =>
      internationalStations
        .filter((s) => matchesQuery(s, debouncedQuery))
        .slice(0, 10),
    [internationalStations, debouncedQuery],
  );

  const settingsAccessory = (
    <Pressable
      onPress={() => router.push("/settings")}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      className="h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-surface active:opacity-70"
    >
      {user?.imageUrl ? (
        <Image
          source={{ uri: user.imageUrl }}
          className="h-9 w-9"
          style={{ borderRadius: 18 }}
        />
      ) : (
        <HugeiconsIcon icon={UserIcon} size={18} color={colors.textPrimary} />
      )}
    </Pressable>
  );

  if (isLoading && stations.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="px-4 pt-4">
          <View className="mb-3 h-12 rounded-3xl bg-surface-light" />
          <View className="mt-2 h-[220px] self-center rounded-[28px] bg-surface-light" style={{ width: "76%" }} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-6"
            contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRowCard key={i} />
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={SCROLL_CONTENT_STYLE}
        keyboardShouldPersistTaps="handled"
      >
        <View className="pt-3">
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Channels, stations, categories…"
            variant="pill"
            trailingAccessory={settingsAccessory}
          />
        </View>

        <View className="min-h-[28px] justify-center px-4 pb-1 pt-1">
          <RefreshIndicator />
        </View>

        {heroStations.length > 0 && (
          <HeroSection featuredStations={heroStations} />
        )}

        <CategoryRow title="Popular TV" stations={tvRow} seeAllHref="/tv" />
        <CategoryRow title="Radio Stations" stations={radioRow} seeAllHref="/radio" />
        {hasInternational ? (
          <CategoryRow
            title="International"
            stations={internationalRow}
            seeAllHref="/tv"
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
