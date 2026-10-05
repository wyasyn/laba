import { EmptyState } from "@/components/EmptyState";
import { LIST_BOTTOM_PADDING, useStationGrid } from "@/components/StationList";
import { IconButton } from "@/components/ui/IconButton";
import { Text } from "@/components/ui/Text";
import { useT } from "@/lib/i18n";
import type { Station } from "@/lib/schemas";
import { useFavouritesStore } from "@/stores/useFavouritesStore";
import { useStationStore } from "@/stores/useStationStore";
import { ArrowLeft01Icon, FavouriteIcon } from "@hugeicons/core-free-icons";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FavouritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { columns, keyExtractor, renderItem } = useStationGrid();
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
  const { t, plural } = useT();

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 4 }} className="flex-row items-center gap-3 px-4 pb-2">
        <IconButton icon={ArrowLeft01Icon} onPress={() => router.back()} accessibilityLabel={t("common.goBack")} />
        <View className="flex-1">
          <Text className="text-[17px] font-semibold">{t("favourites.title")}</Text>
          {count > 0 ? (
            <Text className="text-[13px] text-text-secondary">
              {plural("favourites.count", count)}
            </Text>
          ) : null}
        </View>
      </View>
      <FlashList
        data={favouriteStations}
        key={columns}
        keyExtractor={keyExtractor}
        numColumns={columns}
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            title={t("favourites.emptyTitle")}
            message={t("favourites.emptyMessage")}
            icon={FavouriteIcon}
            actionLabel={t("favourites.browse")}
            onAction={() => router.navigate("/(tabs)")}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: LIST_BOTTOM_PADDING }}
      />
    </View>
  );
}
