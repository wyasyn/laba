import { StationArtwork } from "@/components/StationArtwork";
import { HERO_MAX_ITEMS } from "@/lib/selectHeroStations";
import { Station } from "@/lib/schemas";
import { useTheme } from "@/lib/useTheme";
import { usePlayerStore } from "@/stores/usePlayerStore";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
} from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
/** Narrower than screen so adjacent hero cards peek at the sides. */
const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.76);
/** Gutter between cards (uses page background). */
const CARD_GAP = 24;
const ITEM_STRIDE = CARD_WIDTH + CARD_GAP;
const SIDE_INSET = (SCREEN_WIDTH - CARD_WIDTH) / 2;
const CARD_HEIGHT = 220;
const HERO_IMAGE_RADIUS = 28;

/** Third card (1-based) is the default focus when there are at least three slides. */
function getHeroFocusIndex(length: number) {
  if (length <= 0) return 0;
  if (length < 3) return 0;
  return 2;
}

type ThemeColors = ReturnType<typeof useTheme>["colors"];

export function HeroSection({
  featuredStations,
}: {
  featuredStations: Station[];
}) {
  const { colors } = useTheme();
  const listRef = useRef<FlatList<Station>>(null);
  const scrollToFocusAttempt = useRef(0);

  const items = useMemo(
    () => featuredStations.slice(0, HERO_MAX_ITEMS),
    [featuredStations],
  );

  const itemIdsKey = useMemo(() => items.map((s) => s.id).join(","), [items]);

  const focusIndex = useMemo(() => getHeroFocusIndex(items.length), [items.length]);

  const [activeIndex, setActiveIndex] = useState(() =>
    getHeroFocusIndex(featuredStations.slice(0, HERO_MAX_ITEMS).length),
  );

  useEffect(() => {
    setActiveIndex(focusIndex);
  }, [focusIndex, itemIdsKey]);

  useEffect(() => {
    if (items.length < 3 || focusIndex >= items.length) return;
    scrollToFocusAttempt.current = 0;
    const id = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: focusIndex,
        viewPosition: 0.5,
        animated: false,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [itemIdsKey, items.length, focusIndex]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / ITEM_STRIDE);
      setActiveIndex(Math.min(Math.max(0, idx), items.length - 1));
    },
    [items.length],
  );

  const renderItem: ListRenderItem<Station> = useCallback(
    ({ item }) => (
      <View style={{ width: CARD_WIDTH }}>
        <HeroSlide station={item} colors={colors} />
      </View>
    ),
    [colors],
  );

  const keyExtractor = useCallback((item: Station) => item.id, []);

  const ItemSeparator = useCallback(
    () => (
      <View
        pointerEvents="none"
        style={{
          width: CARD_GAP,
          alignSelf: "stretch",
          minHeight: CARD_HEIGHT + 44,
          backgroundColor: colors.background,
        }}
      />
    ),
    [colors.background],
  );

  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      scrollToFocusAttempt.current += 1;
      if (scrollToFocusAttempt.current > 8) return;
      setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: info.index,
          viewPosition: 0.5,
          animated: false,
        });
      }, 120);
    },
    [],
  );

  if (items.length === 0) return null;

  return (
    <View style={{ marginBottom: 12 }}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={ITEM_STRIDE}
        snapToAlignment="start"
        disableIntervalMomentum
        ItemSeparatorComponent={ItemSeparator}
        contentContainerStyle={{
          paddingLeft: SIDE_INSET,
          paddingRight: SIDE_INSET,
        }}
        renderItem={renderItem}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollToIndexFailed={onScrollToIndexFailed}
        initialNumToRender={HERO_MAX_ITEMS}
        maxToRenderPerBatch={HERO_MAX_ITEMS}
        windowSize={5}
        removeClippedSubviews={false}
      />
      {items.length > 1 ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
          }}
        >
          {items.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === activeIndex ? 8 : 6,
                height: i === activeIndex ? 8 : 6,
                borderRadius: 999,
                backgroundColor:
                  i === activeIndex ? colors.primary : colors.textSecondary + "55",
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function HeroSlide({
  station,
  colors,
}: {
  station: Station;
  colors: ThemeColors;
}) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    usePlayerStore.getState().setPending(station.id);
    router.push({
      pathname: "/station/[id]" as const,
      params: { id: station.id },
    } as never);
  }, [station.id]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Play ${station.name}`}
      style={({ pressed }) => [{ width: CARD_WIDTH, opacity: pressed ? 0.92 : 1 }]}
    >
      <View
        style={{
          height: CARD_HEIGHT,
          borderRadius: HERO_IMAGE_RADIUS,
          overflow: "hidden",
          backgroundColor: colors.surface,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <StationArtwork station={station} variant="hero" style={{ flex: 1 }} />
      </View>
      <Text
        numberOfLines={2}
        style={{
          paddingTop: 18,
          textAlign: "center",
          color: colors.textPrimary,
          fontSize: 14,
          fontWeight: "600",
          letterSpacing: 0.2,
          paddingHorizontal: 4,
        }}
      >
        {station.name}
      </Text>
    </Pressable>
  );
}
