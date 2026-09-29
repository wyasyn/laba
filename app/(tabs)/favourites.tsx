import { EmptyState } from "@/components/EmptyState";
import { StationCard } from "@/components/StationCard";
import { GridCell, LIST_BOTTOM_PADDING } from "@/components/StationList";
import { CompactHeader, LargeTitle, useCollapsingHeader } from "@/components/ui/CollapsingHeader";
import type { Station } from "@/lib/schemas";
import { useFavouritesStore } from "@/stores/useFavouritesStore";
import { useStationStore } from "@/stores/useStationStore";
import { FavouriteIcon } from "@hugeicons/core-free-icons";
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList<Station>);

function keyExtractor(item: Station) {
  return item.id;
}

function renderItem({ item, index }: ListRenderItemInfo<Station>) {
  return (
    <GridCell index={index}>
      <StationCard station={item} />
    </GridCell>
  );
}

export default function FavouritesTabScreen() {
  const router = useRouter();
  const { scrollY, onScroll } = useCollapsingHeader();
  const ids = useFavouritesStore((s) => s.ids);
  const stations = useStationStore((s) => s.stations);

  // Most recently saved first.
  const favouriteStations = useMemo(() => {
    const byId = new Map(stations.map((s) => [s.id, s]));
    const out: Station[] = [];
    for (let i = ids.length - 1; i >= 0; i--) {
      const s = byId.get(ids[i]);
      if (s) out.push(s);
    }
    return out;
  }, [ids, stations]);

  const count = favouriteStations.length;

  return (
    <View className="flex-1 bg-background">
      <AnimatedFlashList
        data={favouriteStations}
        keyExtractor={keyExtractor}
        numColumns={2}
        renderItem={renderItem}
        ListHeaderComponent={
          <LargeTitle
            title="Favourites"
            subtitle={count > 0 ? `${count} saved station${count === 1 ? "" : "s"}` : "Your saved stations"}
            scrollY={scrollY}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="Nothing saved yet"
            message="Tap the heart on any station and it will be waiting for you here."
            icon={FavouriteIcon}
            actionLabel="Browse stations"
            onAction={() => router.navigate("/(tabs)")}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />
      <CompactHeader title="Favourites" scrollY={scrollY} />
    </View>
  );
}
