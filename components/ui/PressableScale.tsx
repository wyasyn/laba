import { haptic, spring } from "@/lib/motion";
import type { ReactNode } from "react";
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export interface PressableScaleProps extends Omit<PressableProps, "style" | "children"> {
  children?: ReactNode;
  /** Classes for the animated inner view (the visual surface). */
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Classes for the outer touch target (use for flex sizing in rows). */
  containerClassName?: string;
  containerStyle?: StyleProp<ViewStyle>;
  /** Scale while pressed. */
  scaleTo?: number;
  /** Light haptic on press. */
  haptics?: boolean;
}

/**
 * Pressable with a springy scale-down on touch. The visual surface lives on an
 * Animated.View so the transform runs on the UI thread.
 */
export function PressableScale({
  children,
  className,
  style,
  containerClassName,
  containerStyle,
  scaleTo = 0.96,
  haptics = true,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: PressableScaleProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.get() * (1 - scaleTo) }],
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    pressed.set(withSpring(1, spring.snappy));
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    pressed.set(withSpring(0, spring.snappy));
    onPressOut?.(e);
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (haptics) haptic.tap();
    onPress?.(e);
  };

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      className={containerClassName}
      style={containerStyle}
    >
      <Animated.View className={className} style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
