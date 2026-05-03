import type { Station } from "@/lib/schemas";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { memo, useCallback } from "react";
import {
  FlatList,
  ListRenderItem,
  Pressable,
  Text,
  View,
} from "react-native";
import { StationCard } from "./StationCard";

interface CategoryRowProps {
  title: string;
  stations: Station[];
  seeAllHref?: Href;
}

const CONTENT_CONTAINER_STYLE = {
  paddingHorizontal: 16,
  paddingVertical: 12,
  gap: 12,
} as const;

export const CategoryRow = memo(function CategoryRow({
  title,
  stations,
  seeAllHref,
}: CategoryRowProps) {
  const router = useRouter();

  const keyExtractor = useCallback((item: Station) => item.id, []);

  const renderItem: ListRenderItem<Station> = useCallback(
    ({ item }) => (
      <View className="w-44 shrink-0">
        <StationCard station={item} layout="stacked" />
      </View>
    ),
    [],
  );

  const onSeeAll = useCallback(() => {
    if (seeAllHref != null) router.push(seeAllHref);
  }, [router, seeAllHref]);

  if (stations.length === 0) return null;

  return (
    <View className="mb-5">
      <View className="mb-2.5 flex-row items-baseline justify-between px-4">
        <Text className="font-inter-bold text-lg text-foreground">{title}</Text>
        {seeAllHref != null ? (
          <Pressable
            onPress={onSeeAll}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`See all ${title}`}
          >
            <Text className="text-sm text-text-secondary">See all</Text>
          </Pressable>
        ) : null}
      </View>
      <FlatList
        data={stations}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={CONTENT_CONTAINER_STYLE}
        renderItem={renderItem}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={3}
        removeClippedSubviews={false}
      />
    </View>
  );
});
