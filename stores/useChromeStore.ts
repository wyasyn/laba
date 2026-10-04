import { useIsFocused } from "expo-router";
import { useEffect } from "react";
import { useAnimatedReaction, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { create } from "zustand";

interface ChromeStore {
  /** Tab bar slid away so a list can use the full height. */
  tabBarHidden: boolean;
  setTabBarHidden: (hidden: boolean) => void;
}

export const useChromeStore = create<ChromeStore>((set) => ({
  tabBarHidden: false,
  setTabBarHidden: (tabBarHidden) => set({ tabBarHidden }),
}));

/**
 * Hides the tab bar while the screen's chrome is more than half hidden (see
 * useCollapsingHeader's `hideY`). Leaving the screen shows everything again.
 */
export function useHideTabBarOnScroll(hideY: SharedValue<number>, hideDistance: number) {
  const isFocused = useIsFocused();
  const setTabBarHidden = useChromeStore((s) => s.setTabBarHidden);

  useAnimatedReaction(
    () => hideDistance > 0 && hideY.get() > hideDistance / 2,
    (next, prev) => {
      if (next !== prev) scheduleOnRN(setTabBarHidden, next);
    },
    [hideDistance],
  );

  useEffect(() => {
    if (isFocused) return;
    hideY.set(0);
    setTabBarHidden(false);
  }, [isFocused, hideY, setTabBarHidden]);
}
