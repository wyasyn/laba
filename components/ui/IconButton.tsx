import { useTheme } from "@/lib/useTheme";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { GlassView } from "./GlassView";
import { PressableScale } from "./PressableScale";

type IconSvg = Parameters<typeof HugeiconsIcon>[0]["icon"];

interface IconButtonProps {
  icon: IconSvg;
  onPress?: () => void;
  accessibilityLabel: string;
  /**
   * surface: themed card fill. glass: frosted, for use over artwork/video.
   * primary: brand red. ghost: no fill.
   */
  variant?: "surface" | "glass" | "primary" | "ghost";
  size?: number;
  iconSize?: number;
  color?: string;
  className?: string;
  disabled?: boolean;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = "surface",
  size = 40,
  iconSize = 20,
  color,
  className,
  disabled,
}: IconButtonProps) {
  const { colors } = useTheme();
  const iconColor =
    color ??
    (variant === "glass" || variant === "primary" ? "#FFFFFF" : colors.textPrimary);

  const dims = { width: size, height: size, borderRadius: size / 2 };
  const content = <HugeiconsIcon icon={icon} size={iconSize} color={iconColor} />;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cn(disabled && "opacity-40", className)}
    >
      {variant === "glass" ? (
        <GlassView dark style={dims} className="items-center justify-center">
          {content}
        </GlassView>
      ) : (
        <SolidCircle variant={variant} style={dims}>
          {content}
        </SolidCircle>
      )}
    </PressableScale>
  );
}

function SolidCircle({
  variant,
  style,
  children,
}: {
  variant: "surface" | "primary" | "ghost";
  style: { width: number; height: number; borderRadius: number };
  children: ReactNode;
}) {
  const cls =
    variant === "primary"
      ? "bg-primary"
      : variant === "surface"
        ? "border border-border bg-surface"
        : "";
  return (
    <View className={cn("items-center justify-center", cls)} style={style}>
      {children}
    </View>
  );
}
