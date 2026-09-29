import { cn } from "@/lib/utils";
import { Text as RNText, type TextProps } from "react-native";

/**
 * App-wide Text. Defaults to the embedded Inter family so `font-semibold`,
 * `font-bold` etc. resolve to the real weight files on both platforms.
 */
export function Text({ className, ...rest }: TextProps & { className?: string }) {
  return <RNText className={cn("font-sans text-foreground", className)} {...rest} />;
}
