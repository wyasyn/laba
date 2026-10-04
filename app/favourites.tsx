import { EmptyState } from "@/components/EmptyState";
import { StationCard } from "@/components/StationCard";
import { GridCell, LIST_BOTTOM_PADDING } from "@/components/StationList";
import { IconButton } from "@/components/ui/IconButton";
import { Text } from "@/components/ui/Text";
import type { Station } from "@/lib/schemas";
import { useFavouritesStore } from "@/stores/useFavouritesStore";
import { useStationStore } from "@/stores/useStationStore";
import { ArrowLeft01Icon, FavouriteIcon } from "@hugeicons/core-free-icons";
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

export default function FavouritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      <View style={{ paddingTop: insets.top + 4 }} className="flex-row items-center gap-3 px-4 pb-2">
        <IconButton icon={ArrowLeft01Icon} onPress={() => router.back()} accessibilityLabel="Go back" />
        <View className="flex-1">
          <Text className="text-[17px] font-semibold">Favourites</Text>
          {count > 0 ? (
            <Text className="text-[13px] text-text-secondary">
              {count} saved station{count === 1 ? "" : "s"}
            </Text>
          ) : null}
        </View>
      </View>
      <FlashList
        data={favouriteStations}
        keyExtractor={keyExtractor}
        numColumns={2}
        renderItem={renderItem}
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
        contentContainerStyle={{ paddingTop: 8, paddingBottom: LIST_BOTTOM_PADDING }}
      />
    </View>
  );
}
