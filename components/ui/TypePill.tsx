import type { StationType } from "@/lib/schemas";
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
  const isTv = type === "tv";
  const solid = variant === "solid";

  return (
    <View
      className={cn(
        "self-start rounded-full px-2 py-[3px]",
        solid ? "bg-black/45" : isTv ? "bg-primary/15" : "bg-success/15",
        className,
      )}
    >
      <Text
        className={cn(
          "text-[10px] font-bold uppercase tracking-widest",
          solid ? "text-white" : isTv ? "text-primary" : "text-success",
        )}
      >
        {isTv ? "TV" : "Radio"}
      </Text>
    </View>
  );
}
