import { useT } from "@/lib/i18n";
import { useTheme } from "@/lib/useTheme";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  /** "pill" puts a See all chip on the right; "inline" makes the title itself the link. */
  variant?: "pill" | "inline";
  /** Shown on the right in place of the See all chip (pill variant only). */
  action?: ReactNode;
}

export function SectionHeader({ title, subtitle, onSeeAll, variant = "pill", action }: SectionHeaderProps) {
  const { colors } = useTheme();
  const { t } = useT();

  if (variant === "inline") {
    const heading = (
      <View className="flex-row items-center gap-1">
        <Text className="text-[22px] font-bold tracking-tight">{title}</Text>
        {onSeeAll ? (
          <HugeiconsIcon icon={ArrowRight01Icon} size={22} color={colors.textSecondary} strokeWidth={2.2} />
        ) : null}
      </View>
    );
    return (
      <View className="items-start px-5">
        {onSeeAll ? (
          <PressableScale
            onPress={onSeeAll}
            hitSlop={10}
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel={t("section.seeAllLabel", { title })}
          >
            {heading}
          </PressableScale>
        ) : (
          heading
        )}
        {subtitle ? <Text className="mt-0.5 text-[13px] text-text-secondary">{subtitle}</Text> : null}
      </View>
    );
  }

  return (
    <View className="flex-row items-end justify-between px-5">
      <View className="flex-1 pr-3">
        <Text className="text-xl font-bold tracking-tight">{title}</Text>
        {subtitle ? (
          <Text className="mt-0.5 text-[13px] text-text-secondary">{subtitle}</Text>
        ) : null}
      </View>
      {action ?? (onSeeAll ? (
        <PressableScale
          onPress={onSeeAll}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("section.seeAllLabel", { title })}
          className="flex-row items-center gap-0.5 rounded-full bg-surface-light py-1.5 pl-3 pr-2"
        >
          <Text className="text-[13px] font-semibold text-text-secondary">{t("section.seeAll")}</Text>
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} color={colors.textSecondary} />
        </PressableScale>
      ) : null)}
    </View>
  );
}
