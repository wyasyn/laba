import { openStation } from "@/components/StationCard";
import { IconButton } from "@/components/ui/IconButton";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { withAlpha } from "@/constants/theme";
import { useT } from "@/lib/i18n";
import type { Station, StationType } from "@/lib/schemas";
import { useTheme } from "@/lib/useTheme";
import { cn } from "@/lib/utils";
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
/** How far the hero card shrinks by the time it has scrolled off. */
const RECEDE_SCALE = 0.86;
/** Corner radius the hero card rounds to as it recedes. */
const RECEDE_RADIUS = 32;
/** Backdrop moves at this fraction of the page scroll (vertical parallax). */
const SCROLL_PARALLAX = 0.35;
const AUTO_ADVANCE_MS = 6000;
/** Space under the buttons for the pagination dots. */
const DOTS_AREA = 44;

const TV_IMAGE = require("@/assets/images/home/hero-tv.jpg");
const RADIO_IMAGE = require("@/assets/images/home/hero-radio.jpg");

/** Hero height: most of the first screen, like a streaming app's billboard. */
export function useHomeHeroHeight() {
  const { height } = useWindowDimensions();
  return Math.round(Math.min(Math.max(height * 0.68, 460), 720));
}

interface Slide {
  key: string;
  type: StationType;
  image: number;
  eyebrow: string;
  title: string;
  meta: string;
  cta: string;
  /** The station the primary button opens. */
  station?: Station;
  href: Href;
}

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
  /** Featured stations; each slide's button starts with one of these when it can. */
  featuredStations: Station[];
  /** Pauses auto-advance while the tab is not visible. */
  active: boolean;
  /** Drawn over the top of the hero (wordmark, refresh pill). */
  header?: ReactNode;
  /** The page's vertical scroll offset, which drives the recede effect. */
  scrollY: SharedValue<number>;
}

export function HomeHero({
  tvStations,
  radioStations,
  featuredStations,
  active,
  header,
  scrollY,
}: HomeHeroProps) {
  const { width } = useWindowDimensions();
  const height = useHomeHeroHeight();
  const reduceMotion = useReducedMotion();
  const listRef = useRef<FlatList<Slide>>(null);
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const { t, plural } = useT();

  const slides = useMemo<Slide[]>(() => {
    const tvPick = pick(
      featuredStations.filter((s) => s.type === "tv"),
      tvStations,
    );
    const radioPick = pick(
      featuredStations.filter((s) => s.type === "radio"),
      radioStations,
    );
    const tvMeta = [plural("hero.channels", tvStations.length), ...topCategories(tvStations)].join(" · ");
    const radioMeta = [plural("hero.stations", radioStations.length), ...topCategories(radioStations)].join(" · ");

    const out: Slide[] = [];
    if (tvStations.length > 0) {
      out.push({
        key: "tv",
        type: "tv",
        image: TV_IMAGE,
        eyebrow: t("hero.tvEyebrow"),
        title: t("hero.tvTitle"),
        meta: tvMeta,
        cta: t("hero.tvCta"),
        station: tvPick,
        href: "/tv",
      });
    }
    if (radioStations.length > 0) {
      out.push({
        key: "radio",
        type: "radio",
        image: RADIO_IMAGE,
        eyebrow: t("hero.radioEyebrow"),
        title: t("hero.radioTitle"),
        meta: radioMeta,
        cta: t("hero.radioCta"),
        station: radioPick,
        href: "/radio",
      });
    }
    return out;
  }, [tvStations, radioStations, featuredStations, t, plural]);

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

  const { resolved, colors } = useTheme();
  const dotColor = resolved === "light" ? colors.textPrimary : "#FFFFFF";

  // As the page scrolls, the hero recedes like a card being put away: it
  // shrinks toward its bottom edge (so it stays attached to the rows below),
  // rounds its corners and dims. Pulling down stretches it to fill the gap.
  const cardStyle = useAnimatedStyle(() => {
    const y = scrollY.get();
    if (y < 0) return { transform: [{ scale: 1 - y / height }], borderRadius: 0, opacity: 1 };
    return {
      transform: [
        { scale: reduceMotion ? 1 : interpolate(y, [0, height], [1, RECEDE_SCALE], Extrapolation.CLAMP) },
      ],
      borderRadius: reduceMotion
        ? 0
        : interpolate(y, [0, height * 0.5], [0, RECEDE_RADIUS], Extrapolation.CLAMP),
      opacity: interpolate(y, [height * 0.35, height], [1, 0.15], Extrapolation.CLAMP),
    };
  });

  // The wordmark and dots go first; the compact bar takes over from the wordmark.
  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [0, 120], [1, 0], Extrapolation.CLAMP),
  }));
  const dotsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [0, height * 0.25], [1, 0], Extrapolation.CLAMP),
  }));

  if (count === 0) return null;

  return (
    <View style={{ height }}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.card, cardStyle]}>
        <Animated.FlatList
          ref={listRef}
          data={slides}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          renderItem={({ item, index: i }) => (
            <HeroSlide
              slide={item}
              index={i}
              scrollX={scrollX}
              scrollY={scrollY}
              width={width}
              height={height}
              reduceMotion={reduceMotion}
            />
          )}
        />

        {/* Bottom edge melts into the page. */}
        <BottomFade />

        {count > 1 ? (
          <Animated.View pointerEvents="none" style={[styles.dots, dotsStyle]}>
            {slides.map((s, i) => (
              <Dot key={s.key} index={i} scrollX={scrollX} width={width} color={dotColor} />
            ))}
          </Animated.View>
        ) : null}
      </Animated.View>

      {header ? (
        <Animated.View pointerEvents="box-none" style={[styles.header, headerStyle]}>
          {header}
        </Animated.View>
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
  scrollY: SharedValue<number>;
  width: number;
  height: number;
  reduceMotion: boolean;
}

function HeroSlide({ slide, index, scrollX, scrollY, width, height, reduceMotion }: HeroSlideProps) {
  const { t } = useT();
  const router = useRouter();
  // Light mode fades the photo into the page and draws the copy in ink;
  // dark mode keeps white copy over a dark scrim.
  const light = useTheme().resolved === "light";
  const title = light ? "text-text-primary" : "text-white";

  // Backdrop drifts slower than the page, sideways between slides and
  // vertically as the page scrolls, for a parallax depth effect. The gap the
  // vertical drift opens at the top always stays above the screen.
  const artStyle = useAnimatedStyle(() => {
    const d = scrollX.get() / width - index;
    const y = Math.max(scrollY.get(), 0);
    return {
      transform: [
        {
          translateX: interpolate(d, [-1, 0, 1], [-PARALLAX, 0, PARALLAX], Extrapolation.CLAMP),
        },
        { translateY: reduceMotion ? 0 : y * SCROLL_PARALLAX },
      ],
    };
  });

  // Copy fades as the slide leaves so two titles never overlap, and lifts
  // away ahead of the backdrop as the page scrolls.
  const contentStyle = useAnimatedStyle(() => {
    const d = Math.abs(scrollX.get() / width - index);
    const y = Math.max(scrollY.get(), 0);
    return {
      opacity:
        interpolate(d, [0, 0.5], [1, 0], Extrapolation.CLAMP) *
        interpolate(y, [0, height * 0.4], [1, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: reduceMotion ? 0 : interpolate(y, [0, height * 0.5], [0, -40], Extrapolation.CLAMP) },
      ],
    };
  });

  const art = {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: -PARALLAX,
    width: width + PARALLAX * 2,
  } as const;

  const onPrimary = () => (slide.station ? openStation(router, slide.station) : router.push(slide.href));

  return (
    <View style={{ width, height, overflow: "hidden" }}>
      <Animated.View style={[art, artStyle]}>
        <Image source={slide.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      </Animated.View>
      <Scrims light={light} />
      <Animated.View style={[styles.content, contentStyle]}>
        <Eyebrow light={light}>{slide.eyebrow}</Eyebrow>
        <Text className={cn("mt-3 text-[44px] font-bold leading-[48px] tracking-tighter", title)}>
          {slide.title}
        </Text>
        <Text
          numberOfLines={1}
          className={cn("mt-2 text-[15px] font-medium", light ? "text-text-secondary" : "text-white/80")}
        >
          {slide.meta}
        </Text>
        <View className="mt-5 flex-row items-center gap-3">
          <PrimaryButton
            light={light}
            label={slide.cta}
            onPress={onPrimary}
            accessibilityLabel={slide.station ? `${slide.cta}: ${slide.station.name}` : slide.cta}
          />
          <IconButton
            icon={ArrowRight01Icon}
            variant={light ? "surface" : "glass"}
            size={48}
            iconSize={22}
            onPress={() => router.push(slide.href)}
            accessibilityLabel={slide.type === "tv" ? t("hero.browseTv") : t("hero.browseRadio")}
          />
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * A dark scrim at the top (for the header) and one at the bottom (for the
 * copy). In light mode the bottom one fades into the page background instead,
 * so the hero blends into the white page rather than ending in a dark band.
 */
function Scrims({ light }: { light: boolean }) {
  const { colors } = useTheme();
  const bg = colors.background;
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)"]}
        style={styles.topScrim}
      />
      {light ? (
        <LinearGradient
          pointerEvents="none"
          colors={[withAlpha(bg, 0), withAlpha(bg, 0.75), withAlpha(bg, 0.96), bg]}
          locations={[0.28, 0.5, 0.68, 1]}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"]}
          locations={[0.3, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}
    </>
  );
}

function Eyebrow({ children, light }: { children: string; light: boolean }) {
  return (
    <View
      className={cn(
        "self-start rounded-full border px-3 py-1",
        light ? "border-border bg-surface" : "border-white/20 bg-black/35",
      )}
    >
      <Text
        className={cn("text-[12px] font-semibold tracking-wide", light ? "text-text-primary" : "text-white")}
      >
        {children}
      </Text>
    </View>
  );
}

function PrimaryButton({
  light,
  label,
  onPress,
  accessibilityLabel,
}: {
  light: boolean;
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  const ink = light ? colors.onPrimary : "#0C0C09";
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      containerClassName="flex-1"
      className={cn(
        "h-12 flex-row items-center justify-center gap-2 rounded-full",
        light ? "bg-primary" : "bg-white",
      )}
      style={styles.buttonShadow}
    >
      <HugeiconsIcon icon={PlayIcon} size={18} color={ink} fill={ink} />
      <Text className="text-[16px] font-semibold" style={{ color: ink }}>
        {label}
      </Text>
    </PressableScale>
  );
}

function Dot({
  index,
  scrollX,
  width,
  color,
}: {
  index: number;
  scrollX: SharedValue<number>;
  width: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(scrollX.get() / width - index);
    return {
      width: interpolate(d, [0, 1], [22, 6], Extrapolation.CLAMP),
      opacity: interpolate(d, [0, 1], [1, 0.4], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderCurve: "continuous",
    transformOrigin: "bottom",
  },
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
  },
});
