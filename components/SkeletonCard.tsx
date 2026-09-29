import { CARD_META_HEIGHT, CARD_RADIUS } from "@/components/StationCard";
import { Skeleton } from "@/components/ui/Shimmer";
import { View } from "react-native";

/**
 * Placeholder matching StationCard. Render inside a ShimmerGroup so all
 * placeholders sweep together.
 */
export function SkeletonCard() {
  return (
    <View>
      <Skeleton style={{ aspectRatio: 1, width: "100%", borderRadius: CARD_RADIUS }} />
      <View style={{ height: CARD_META_HEIGHT, paddingTop: 11, paddingHorizontal: 2, gap: 7 }}>
        <Skeleton style={{ width: "78%", height: 12, borderRadius: 6 }} />
        <Skeleton style={{ width: "52%", height: 10, borderRadius: 5 }} />
      </View>
    </View>
  );
}

/** Placeholder for the full-bleed home hero. */
export function SkeletonHero({ height }: { height: number }) {
  return (
    <View style={{ height }}>
      <Skeleton style={{ width: "100%", height, borderRadius: 0 }} />
      <View className="absolute bottom-11 left-5 right-5 gap-3">
        <Skeleton style={{ width: 84, height: 24, borderRadius: 12 }} />
        <Skeleton style={{ width: "62%", height: 40, borderRadius: 10 }} />
        <Skeleton style={{ width: "48%", height: 14, borderRadius: 7 }} />
        <Skeleton style={{ width: "100%", height: 48, borderRadius: 24, marginTop: 8 }} />
      </View>
    </View>
  );
}

/** Placeholder for a section title row. */
export function SkeletonTitle() {
  return (
    <View className="gap-2 px-5">
      <Skeleton style={{ width: 140, height: 18, borderRadius: 6 }} />
    </View>
  );
}
