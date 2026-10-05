import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CACHE_KEYS } from "@/lib/constants";

interface FavouritesStore {
  ids: string[];
  isLoaded: boolean;

  // Actions
  hydrate: () => Promise<void>;
  toggle: (stationId: string) => void;
  isFavourite: (stationId: string) => boolean;
  /** Sync only: take the merged list from the cloud. */
  replace: (ids: string[]) => void;
}

export const useFavouritesStore = create<FavouritesStore>((set, get) => ({
  ids: [],
  isLoaded: false,

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(CACHE_KEYS.FAVOURITES);
      if (stored) {
        set({ ids: JSON.parse(stored), isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  toggle: (stationId) => {
    const { ids: prev } = get();
    const next = prev.includes(stationId)
      ? prev.filter((id) => id !== stationId)
      : [...prev, stationId];

    set({ ids: next });
    AsyncStorage.setItem(CACHE_KEYS.FAVOURITES, JSON.stringify(next)).catch(
      () => {
        // Revert optimistic update on storage failure
        set({ ids: prev });
      }
    );
  },

  isFavourite: (stationId) => {
    return get().ids.includes(stationId);
  },

  replace: (ids) => {
    set({ ids });
    AsyncStorage.setItem(CACHE_KEYS.FAVOURITES, JSON.stringify(ids)).catch(() => {});
  },
}));
