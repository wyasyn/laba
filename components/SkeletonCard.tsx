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

/** Placeholder for the home hero carousel. */
export function SkeletonHero({ width, height }: { width: number; height: number }) {
  return (
    <View className="items-center">
      <Skeleton style={{ width, height, borderRadius: 28 }} />
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
