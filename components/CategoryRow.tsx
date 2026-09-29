import { SectionHeader } from "@/components/ui/SectionHeader";
import { enterFromBelow } from "@/lib/motion";
import type { Station } from "@/lib/schemas";
import { FlashList } from "@shopify/flash-list";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { memo } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { CARD_META_HEIGHT, StationCard } from "./StationCard";

interface CategoryRowProps {
  title: string;
  subtitle?: string;
  stations: Station[];
  seeAllHref?: Href;
  /** Position on the page, used to stagger the entrance. */
  index?: number;
}

const CARD_WIDTH = 148;
const ROW_HEIGHT = CARD_WIDTH + CARD_META_HEIGHT + 12;
const CONTENT_CONTAINER_STYLE = { paddingHorizontal: 20, paddingTop: 12 } as const;

function Gap() {
  return <View style={{ width: 12 }} />;
}

function keyExtractor(item: Station) {
  return item.id;
}

function renderItem({ item }: { item: Station }) {
  return (
    <View style={{ width: CARD_WIDTH }}>
      <StationCard station={item} />
    </View>
  );
}

export const CategoryRow = memo(function CategoryRow({
  title,
  subtitle,
  stations,
  seeAllHref,
  index = 0,
}: CategoryRowProps) {
  const router = useRouter();

  if (stations.length === 0) return null;

  return (
    <Animated.View entering={enterFromBelow(index)} className="mb-8">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        onSeeAll={seeAllHref != null ? () => router.push(seeAllHref) : undefined}
      />
      <View style={{ height: ROW_HEIGHT }}>
        <FlashList
        data={stations}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={CONTENT_CONTAINER_STYLE}
        ItemSeparatorComponent={Gap}
        renderItem={renderItem}
        />
      </View>
    </Animated.View>
  );
});
