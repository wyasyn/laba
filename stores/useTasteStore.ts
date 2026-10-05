import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CACHE_KEYS } from "@/lib/constants";
import {
  EMPTY_PROFILE,
  recordListen,
  recordOpen,
  recordSkip,
  type TasteProfile,
} from "@/lib/taste";

interface TasteStore {
  profile: TasteProfile;
  /** When true nothing new is learned; existing rows stay until cleared. */
  paused: boolean;
  isLoaded: boolean;

  // Actions
  hydrate: () => Promise<void>;
  recordOpen: (stationId: string) => void;
  recordListen: (stationId: string, ms: number) => void;
  recordSkip: (stationId: string) => void;
  setPaused: (paused: boolean) => void;
  reset: () => void;
}

function persist(profile: TasteProfile) {
  AsyncStorage.setItem(CACHE_KEYS.TASTE, JSON.stringify(profile)).catch(() => {});
}

export const useTasteStore = create<TasteStore>((set, get) => {
  /** Applies a learning step unless learning is paused, then saves. */
  const learn = (step: (profile: TasteProfile, now: number) => TasteProfile) => {
    if (get().paused) return;
    const next = step(get().profile, Date.now());
    if (next === get().profile) return;
    set({ profile: next });
    persist(next);
  };

  return {
    profile: EMPTY_PROFILE,
    paused: false,
    isLoaded: false,

    hydrate: async () => {
      try {
        const [stored, paused] = await Promise.all([
          AsyncStorage.getItem(CACHE_KEYS.TASTE),
          AsyncStorage.getItem(CACHE_KEYS.TASTE_PAUSED),
        ]);
        // Anything learned before hydration finished is newer than the stored copy.
        const loaded: TasteProfile = stored ? JSON.parse(stored) : EMPTY_PROFILE;
        const profile = { ...loaded, stations: { ...loaded.stations, ...get().profile.stations } };
        set({ profile, paused: paused === "true", isLoaded: true });
      } catch {
        set({ isLoaded: true });
      }
    },

    recordOpen: (stationId) => learn((p, now) => recordOpen(p, stationId, now)),
    recordListen: (stationId, ms) => learn((p, now) => recordListen(p, stationId, ms, now)),
    recordSkip: (stationId) => learn((p, now) => recordSkip(p, stationId, now)),

    setPaused: (paused) => {
      set({ paused });
      AsyncStorage.setItem(CACHE_KEYS.TASTE_PAUSED, String(paused)).catch(() => {});
    },

    reset: () => {
      set({ profile: EMPTY_PROFILE });
      persist(EMPTY_PROFILE);
    },
  };
});
