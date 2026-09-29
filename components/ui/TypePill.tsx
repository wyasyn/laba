import { StationTypeIcon } from "@/components/icons/StationTypeIcon";
import type { StationType } from "@/lib/schemas";
import { useTheme } from "@/lib/useTheme";
import { cn } from "@/lib/utils";
import { View } from "react-native";
import { Text } from "./Text";

interface TypePillProps {
  type: StationType;
  /** "solid" for use over artwork, "tinted" on themed surfaces. */
  variant?: "solid" | "tinted";
  className?: string;
}

export function TypePill({ type, variant = "tinted", className }: TypePillProps) {
  const { colors } = useTheme();
  const isTv = type === "tv";
  const solid = variant === "solid";
  const tint = solid ? "#FFFFFF" : isTv ? colors.primary : colors.success;

  return (
    <View
      className={cn(
        "flex-row items-center gap-1 self-start rounded-full py-[3px] pl-1.5 pr-2",
        solid ? "bg-black/45" : isTv ? "bg-primary/15" : "bg-success/15",
        className,
      )}
    >
      <StationTypeIcon type={type} size={12} color={tint} strokeWidth={2.2} />
      <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: tint }}>
        {isTv ? "Live TV" : "Radio"}
      </Text>
    </View>
  );
}
