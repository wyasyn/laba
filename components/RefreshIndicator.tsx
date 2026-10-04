import { Text } from "@/components/ui/Text";
import { duration } from "@/lib/motion";
import { useTheme } from "@/lib/useTheme";
import { useStationStore } from "@/stores/useStationStore";
import { ActivityIndicator } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

interface RefreshIndicatorProps {
  label?: string;
}

/** Small pill that fades in while stations refresh in the background. */
export function RefreshIndicator({ label = "Updating" }: RefreshIndicatorProps) {
  const isRefreshing = useStationStore((s) => s.isRefreshing);
  const { colors } = useTheme();

  if (!isRefreshing) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(duration.base)}
      exiting={FadeOut.duration(duration.base)}
      className="mb-1.5 flex-row items-center self-end rounded-full border border-border bg-surface px-3 py-1.5"
    >
      <ActivityIndicator size="small" color={colors.primary} style={{ transform: [{ scale: 0.75 }] }} />
      <Text className="ml-1.5 text-xs font-medium text-text-secondary">{label}</Text>
    </Animated.View>
  );
}
