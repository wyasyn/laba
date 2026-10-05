import { PressableScale } from "@/components/ui/PressableScale";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Text } from "@/components/ui/Text";
import { useT } from "@/lib/i18n";
import { enterFromBelow } from "@/lib/motion";
import type { Station } from "@/lib/schemas";
import { useTheme } from "@/lib/useTheme";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { FlashList } from "@shopify/flash-list";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { memo, type ReactNode } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { CARD_META_HEIGHT, CARD_RADIUS, StationCard } from "./StationCard";

interface CategoryRowProps {
  title: string;
  subtitle?: string;
  stations: Station[];
  seeAllHref?: Href;
  /** Size of the full list. When larger than `stations`, a See all tile ends the row. */
  totalCount?: number;
  headerVariant?: "pill" | "inline";
  /** Replaces the See all chip on the right of the header. */
  headerAction?: ReactNode;
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
  totalCount,
  headerVariant,
  headerAction,
  index = 0,
}: CategoryRowProps) {
  const router = useRouter();

  if (stations.length === 0) return null;

  const onSeeAll = seeAllHref != null ? () => router.push(seeAllHref) : undefined;
  const remaining = (totalCount ?? 0) - stations.length;

  return (
    <Animated.View entering={enterFromBelow(index)} className="mb-8">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        onSeeAll={onSeeAll}
        variant={headerVariant}
        action={headerAction}
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
        ListFooterComponent={
          onSeeAll && remaining > 0 ? (
            <SeeAllTile title={title} remaining={remaining} onPress={onSeeAll} />
          ) : null
        }
        />
      </View>
    </Animated.View>
  );
});

function SeeAllTile({ title, remaining, onPress }: { title: string; remaining: number; onPress: () => void }) {
  const { colors } = useTheme();
  const { t } = useT();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.965}
      accessibilityRole="button"
      accessibilityLabel={t("section.seeAllMoreLabel", { title, count: remaining })}
      containerStyle={{ width: CARD_WIDTH, marginLeft: 12 }}
    >
      <View
        className="items-center justify-center gap-3 border border-border bg-surface"
        style={{ width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: CARD_RADIUS, borderCurve: "continuous" }}
      >
        <View className="h-12 w-12 items-center justify-center rounded-full bg-surface-light">
          <HugeiconsIcon icon={ArrowRight01Icon} size={22} color={colors.textPrimary} strokeWidth={2.2} />
        </View>
        <View className="items-center">
          <Text className="text-[15px] font-semibold">{t("section.seeAll")}</Text>
          <Text className="mt-0.5 text-[12px] font-medium text-text-secondary">{t("section.more", { count: remaining })}</Text>
        </View>
      </View>
    </PressableScale>
  );
}
