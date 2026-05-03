import { CategoryRow } from "@/components/CategoryRow";
import { HeroSection } from "@/components/HeroSection";
import { RefreshIndicator } from "@/components/RefreshIndicator";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useStationStore } from "@/stores/useStationStore";
import { useUser } from "@clerk/expo";
import { UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";

const SCROLL_CONTENT_STYLE = { paddingBottom: 20 } as const;

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const {
    stations,
    isLoading,
    tvStations,
    radioStations,
    internationalStations,
    featuredStations,
  } = useStationStore(
    useShallow((s) => ({
      stations: s.stations,
      isLoading: s.isLoading,
      tvStations: s.tvStations,
      radioStations: s.radioStations,
      internationalStations: s.internationalStations,
      featuredStations: s.featuredStations,
    })),
  );

  if (isLoading && stations.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="px-4 pt-6">
          <View className="mb-6 h-8 w-32 rounded bg-surface-light" />
          <View className="mb-6 h-52 rounded-2xl bg-surface-light" />
          <View className="flex-row flex-wrap justify-between">
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} className="w-[48%]">
                <SkeletonCard />
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={SCROLL_CONTENT_STYLE}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pb-4 pt-6">
          <View className="flex-1">
            <Text className="text-3xl font-bold text-foreground">Laba</Text>
            <Text className="mt-1 text-sm text-text-secondary">
              Live TV & radio — Uganda & beyond
            </Text>
            <View className="mt-2">
              <RefreshIndicator />
            </View>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            className="h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-surface active:opacity-70"
          >
            {user?.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                className="h-10 w-10"
                style={{ borderRadius: 20 }}
              />
            ) : (
              <HugeiconsIcon icon={UserIcon} size={20} color="#fff" />
            )}
          </Pressable>
        </View>

        {/* Hero */}
        {featuredStations.length > 0 && (
          <HeroSection featuredStations={featuredStations} />
        )}

        {/* Category rows */}
        <CategoryRow title="Popular TV" stations={tvStations.slice(0, 10)} />
        <CategoryRow
          title="Radio Stations"
          stations={radioStations.slice(0, 10)}
        />
        {internationalStations.length > 0 && (
          <CategoryRow title="International" stations={internationalStations} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
