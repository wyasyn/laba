import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CACHE_KEYS } from "@/lib/constants";

/** How many recently opened stations to remember. */
const MAX_RECENTS = 20;

interface RecentsStore {
  /** Station ids, most recently opened first. */
  ids: string[];
  isLoaded: boolean;

  // Actions
  hydrate: () => Promise<void>;
  record: (stationId: string) => void;
  clear: () => void;
}

function persist(ids: string[]) {
  AsyncStorage.setItem(CACHE_KEYS.RECENTS, JSON.stringify(ids)).catch(() => {});
}

export const useRecentsStore = create<RecentsStore>((set, get) => ({
  ids: [],
  isLoaded: false,

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(CACHE_KEYS.RECENTS);
      // Anything recorded before hydration finished goes in front of the stored list.
      const merged = [...get().ids, ...(stored ? (JSON.parse(stored) as string[]) : [])];
      set({ ids: [...new Set(merged)].slice(0, MAX_RECENTS), isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  record: (stationId) => {
    const { ids } = get();
    if (ids[0] === stationId) return;
    const next = [stationId, ...ids.filter((id) => id !== stationId)].slice(0, MAX_RECENTS);
    set({ ids: next });
    persist(next);
  },

  clear: () => {
    set({ ids: [] });
    persist([]);
  },
}));
