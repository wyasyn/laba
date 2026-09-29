import { FavouriteButton } from "@/components/FavouriteButton";
import { StationArtwork } from "@/components/StationArtwork";
import { openStation } from "@/components/StationCard";
import { IconButton } from "@/components/ui/IconButton";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { TypePill } from "@/components/ui/TypePill";
import type { Station, StationType } from "@/lib/schemas";
import { useTheme } from "@/lib/useTheme";
import { ArrowRight01Icon, PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View, useWindowDimensions, type FlatList } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const PARALLAX = 48;
const AUTO_ADVANCE_MS = 6000;
/** Featured stations shown after the TV and Radio slides. */
const MAX_STATION_SLIDES = 3;
/** Space under the buttons for the pagination dots. */
const DOTS_AREA = 44;

const TV_IMAGE = require("@/assets/images/home/hero-tv.jpg");
const RADIO_IMAGE = require("@/assets/images/home/hero-radio.jpg");

/**
 * Bundled backdrops for featured station slides, so every slide has a photo
 * whatever the station (logos alone look thin at this size). Photos from
 * Unsplash (unsplash.com/license). `tags` match station categories.
 * Each pool must hold at least MAX_STATION_SLIDES photos so none repeat.
 */
const STATION_PHOTOS: Record<StationType, { image: number; tags: string[] }[]> = {
  tv: [
    { image: require("@/assets/images/home/tv-stage.jpg"), tags: ["entertainment", "music", "general"] },
    { image: require("@/assets/images/home/tv-studio.jpg"), tags: ["news", "education", "business"] },
    { image: require("@/assets/images/home/tv-concert.jpg"), tags: ["culture", "lifestyle", "religious"] },
  ],
  radio: [
    { image: require("@/assets/images/home/radio-mic.jpg"), tags: ["talk", "news", "religious"] },
    { image: require("@/assets/images/home/radio-mixer.jpg"), tags: ["music", "entertainment"] },
    { image: RADIO_IMAGE, tags: ["general", "culture", "education"] },
  ],
};

/**
 * One photo per station slide, never repeating within the carousel: first a
 * photo whose tags match the station's categories, then the next unused one.
 */
function assignPhotos(stations: Station[]) {
  const used = new Set<number>();
  return stations.map((s) => {
    const pool = STATION_PHOTOS[s.type];
    const cats = s.categories.map((c) => c.toLowerCase());
    const photo =
      pool.find((p) => !used.has(p.image) && p.tags.some((t) => cats.includes(t))) ??
      pool.find((p) => !used.has(p.image)) ??
      pool[0];
    used.add(photo.image);
    return photo.image;
  });
}

/** Hero height: most of the first screen, like a streaming app's billboard. */
export function useHomeHeroHeight() {
  const { height } = useWindowDimensions();
  return Math.round(Math.min(Math.max(height * 0.68, 460), 720));
}

type Slide =
  | {
      kind: "editorial";
      key: string;
      type: StationType;
      image: number;
      eyebrow: string;
      title: string;
      meta: string;
      cta: string;
      station?: Station;
      href: Href;
    }
  | { kind: "station"; key: string; station: Station; image: number };

function hasLogo(s: Station) {
  return Boolean(s.logo?.trim());
}

/** The two most common categories, e.g. "News · Music". */
function topCategories(stations: Station[]) {
  const counts = new Map<string, number>();
  for (const s of stations) {
    for (const c of s.categories) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([c]) => c.charAt(0).toUpperCase() + c.slice(1));
}

function pick(featured: Station[], all: Station[]) {
  return featured.find(hasLogo) ?? all.find(hasLogo) ?? all[0];
}

interface HomeHeroProps {
  tvStations: Station[];
  radioStations: Station[];
  /** Featured stations, already ranked (see selectHeroStations). */
  featuredStations: Station[];
  /** Pauses auto-advance while the tab is not visible. */
  active: boolean;
  /** Drawn over the top of the hero (wordmark, refresh pill). */
  header?: ReactNode;
}

export function HomeHero({ tvStations, radioStations, featuredStations, active, header }: HomeHeroProps) {
  const { width } = useWindowDimensions();
  const height = useHomeHeroHeight();
  const reduceMotion = useReducedMotion();
  const listRef = useRef<FlatList<Slide>>(null);
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);

  const slides = useMemo<Slide[]>(() => {
    const tvPick = pick(featuredStations.filter((s) => s.type === "tv"), tvStations);
    const radioPick = pick(featuredStations.filter((s) => s.type === "radio"), radioStations);
    const tvMeta = [`${tvStations.length} channels`, ...topCategories(tvStations)].join(" · ");
    const radioMeta = [`${radioStations.length} stations`, ...topCategories(radioStations)].join(" · ");

    const out: Slide[] = [];
    if (tvStations.length > 0) {
      out.push({
        kind: "editorial",
        key: "editorial-tv",
        type: "tv",
        image: TV_IMAGE,
        eyebrow: "Live now",
        title: "Live TV",
        meta: tvMeta,
        cta: "Watch now",
        station: tvPick,
        href: "/tv",
      });
    }
    if (radioStations.length > 0) {
      out.push({
        kind: "editorial",
        key: "editorial-radio",
        type: "radio",
        image: RADIO_IMAGE,
        eyebrow: "On air",
        title: "Radio",
        meta: radioMeta,
        cta: "Listen now",
        station: radioPick,
        href: "/radio",
      });
    }
    const used = new Set([tvPick?.id, radioPick?.id]);
    const picks = featuredStations.filter((s) => !used.has(s.id)).slice(0, MAX_STATION_SLIDES);
    const photos = assignPhotos(picks);
    picks.forEach((s, i) => out.push({ kind: "station", key: s.id, station: s, image: photos[i] }));
    return out;
  }, [tvStations, radioStations, featuredStations]);

  const count = slides.length;

  // Advance to the next slide, rewinding at the end. Restarts whenever the
  // user settles on a slide, and stays off while dragging or off screen.
  useEffect(() => {
    if (!active || dragging || reduceMotion || count < 2) return;
    const id = setTimeout(() => {
      const next = (index + 1) % count;
      listRef.current?.scrollToOffset({ offset: next * width, animated: true });
      setIndex(next);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(id);
  }, [active, dragging, reduceMotion, count, index, width]);

  const settle = (x: number) => {
    setDragging(false);
    setIndex(Math.round(x / width));
  };

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.set(e.contentOffset.x);
    },
    onBeginDrag: () => {
      scheduleOnRN(setDragging, true);
    },
    onMomentumEnd: (e) => {
      scheduleOnRN(settle, e.contentOffset.x);
    },
  });

  if (count === 0) return null;

  return (
    <View style={{ height }}>
      <Animated.FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index: i }) => (
          <HeroSlide slide={item} index={i} scrollX={scrollX} width={width} height={height} />
        )}
      />

      {/* Bottom edge melts into the page. */}
      <BottomFade />

      {header ? (
        <View pointerEvents="box-none" style={styles.header}>
          {header}
        </View>
      ) : null}

      {count > 1 ? (
        <View pointerEvents="none" style={styles.dots}>
          {slides.map((s, i) => (
            <Dot key={s.key} index={i} scrollX={scrollX} width={width} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function BottomFade() {
  const { colors } = useTheme();
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[`${colors.background}00`, colors.background]}
      style={styles.bottomFade}
    />
  );
}

interface HeroSlideProps {
  slide: Slide;
  index: number;
  scrollX: SharedValue<number>;
  width: number;
  height: number;
}

function HeroSlide({ slide, index, scrollX, width, height }: HeroSlideProps) {
  const router = useRouter();

  // Backdrop drifts slower than the page for a parallax depth effect.
  const artStyle = useAnimatedStyle(() => {
    const d = scrollX.get() / width - index;
    return {
      transform: [{ translateX: interpolate(d, [-1, 0, 1], [-PARALLAX, 0, PARALLAX], Extrapolation.CLAMP) }],
    };
  });

  // Copy fades as the slide leaves so two titles never overlap.
  const contentStyle = useAnimatedStyle(() => {
    const d = Math.abs(scrollX.get() / width - index);
    return { opacity: interpolate(d, [0, 0.5], [1, 0], Extrapolation.CLAMP) };
  });

  const art = { position: "absolute", top: 0, bottom: 0, left: -PARALLAX, width: width + PARALLAX * 2 } as const;

  if (slide.kind === "editorial") {
    const onPrimary = () =>
      slide.station ? openStation(router, slide.station) : router.push(slide.href);
    return (
      <View style={{ width, height, overflow: "hidden" }}>
        <Animated.View style={[art, artStyle]}>
          <Image source={slide.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        </Animated.View>
        <Scrims />
        <Animated.View style={[styles.content, contentStyle]}>
          <Eyebrow>{slide.eyebrow}</Eyebrow>
          <Text className="mt-3 text-[44px] font-bold leading-[48px] tracking-tighter text-white">
            {slide.title}
          </Text>
          <Text numberOfLines={1} className="mt-2 text-[15px] font-medium text-white/80">
            {slide.meta}
          </Text>
          <View className="mt-5 flex-row items-center gap-3">
            <PrimaryButton
              label={slide.cta}
              onPress={onPrimary}
              accessibilityLabel={slide.station ? `${slide.cta}: ${slide.station.name}` : slide.cta}
            />
            <IconButton
              icon={ArrowRight01Icon}
              variant="glass"
              size={48}
              iconSize={22}
              onPress={() => router.push(slide.href)}
              accessibilityLabel={slide.type === "tv" ? "Browse all TV channels" : "Browse all radio stations"}
            />
          </View>
          {slide.station ? (
            <Text numberOfLines={1} className="mt-3 text-[13px] text-white/60">
              Starts with {slide.station.name}
            </Text>
          ) : null}
        </Animated.View>
      </View>
    );
  }

  const { station } = slide;
  return (
    <View style={{ width, height, overflow: "hidden" }}>
      <Animated.View style={[art, artStyle]}>
        <Image source={slide.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      </Animated.View>
      <Scrims />
      <Animated.View style={[styles.content, contentStyle]}>
        <Eyebrow>Featured</Eyebrow>
        <View className="mt-3 flex-row items-center gap-3">
          <View style={styles.logoShadow}>
            <View style={styles.logo}>
              <StationArtwork station={station} variant="tile" />
            </View>
          </View>
          <Text
            numberOfLines={1}
            className="flex-1 text-[36px] font-bold leading-[42px] tracking-tighter text-white"
          >
            {station.name}
          </Text>
        </View>
        <View className="mt-2 flex-row items-center gap-2">
          <TypePill type={station.type} variant="solid" />
          {station.description ? (
            <Text numberOfLines={1} className="shrink text-[14px] text-white/75">
              {station.description}
            </Text>
          ) : null}
        </View>
        <View className="mt-5 flex-row items-center gap-3">
          <PrimaryButton
            label={station.type === "tv" ? "Watch now" : "Listen now"}
            onPress={() => openStation(router, station)}
            accessibilityLabel={`Play ${station.name}`}
          />
          <FavouriteButton stationId={station.id} size={26} />
        </View>
      </Animated.View>
    </View>
  );
}

/** Dark scrims at the top (for the header) and bottom (for the copy). */
function Scrims() {
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)"]}
        style={styles.topScrim}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"]}
        locations={[0.3, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
    </>
  );
}

function Eyebrow({ children }: { children: string }) {
  return (
    <View className="self-start rounded-full border border-white/20 bg-black/35 px-3 py-1">
      <Text className="text-[12px] font-semibold tracking-wide text-white">{children}</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      containerClassName="flex-1"
      className="h-12 flex-row items-center justify-center gap-2 rounded-full bg-white"
      style={styles.buttonShadow}
    >
      <HugeiconsIcon icon={PlayIcon} size={18} color="#0C0C09" fill="#0C0C09" />
      <Text className="text-[16px] font-semibold text-[#0C0C09]">{label}</Text>
    </PressableScale>
  );
}

function Dot({ index, scrollX, width }: { index: number; scrollX: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(scrollX.get() / width - index);
    return {
      width: interpolate(d, [0, 1], [22, 6], Extrapolation.CLAMP),
      opacity: interpolate(d, [0, 1], [1, 0.4], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  content: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: DOTS_AREA,
  },
  topScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 16,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  logoShadow: {
    borderRadius: 14,
    backgroundColor: "#000",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  buttonShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  dots: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
});
