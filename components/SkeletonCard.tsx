import { Skeleton } from "@/components/ui/Shimmer";
import { View } from "react-native";

/**
 * Placeholder matching StationCard. Render inside a ShimmerGroup so all
 * placeholders sweep together.
 */
export function SkeletonCard({ aspectRatio = 3 / 4 }: { aspectRatio?: number }) {
  return <Skeleton style={{ aspectRatio, width: "100%", borderRadius: 22 }} />;
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
