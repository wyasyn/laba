import { useTheme } from "@/lib/useTheme";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { View } from "react-native";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, subtitle, onSeeAll }: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View className="flex-row items-end justify-between px-5">
      <View className="flex-1 pr-3">
        <Text className="text-xl font-bold tracking-tight">{title}</Text>
        {subtitle ? (
          <Text className="mt-0.5 text-[13px] text-text-secondary">{subtitle}</Text>
        ) : null}
      </View>
      {onSeeAll ? (
        <PressableScale
          onPress={onSeeAll}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`See all ${title}`}
          className="flex-row items-center gap-0.5 rounded-full bg-surface-light py-1.5 pl-3 pr-2"
        >
          <Text className="text-[13px] font-semibold text-text-secondary">See all</Text>
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} color={colors.textSecondary} />
        </PressableScale>
      ) : null}
    </View>
  );
}
