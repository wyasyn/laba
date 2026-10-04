import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Kept from the original onboarding screen so existing installs skip it.
const ONBOARDING_COMPLETED_KEY = "onboarding_completed_v1";

interface OnboardingStore {
  completed: boolean;
  isLoaded: boolean;
  hydrate: () => Promise<void>;
  complete: () => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  completed: false,
  isLoaded: false,

  hydrate: async () => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      set({ completed: value === "true", isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  complete: () => {
    set({ completed: true });
    AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true").catch(() => {});
  },
}));
