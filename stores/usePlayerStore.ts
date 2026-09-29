import { create } from "zustand";
import type { Station } from "@/lib/schemas";

export type PlaybackStatus = "idle" | "loading" | "playing" | "paused" | "error";

interface PlayerStore {
  /** Radio station loaded into the global AudioEngine (null when nothing is on). */
  currentStation: Station | null;
  // Set on press, before navigation. Lets the detail screen show the right art instantly.
  pendingStationId: string | null;
  /** User intent. The engine follows it; `status` reports what actually happens. */
  wantsPlaying: boolean;
  status: PlaybackStatus;
  error: string | null;
  volume: number;
  /** Bumped by retry() so the engine reloads the stream. */
  reloadToken: number;

  // Actions
  setPending: (stationId: string) => void;
  clearPending: () => void;
  play: (station: Station) => void;
  pause: () => void;
  resume: () => void;
  togglePlayback: () => void;
  stop: () => void;
  retry: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;

  /** Engine only: report the real playback state. */
  reportStatus: (status: PlaybackStatus, error?: string | null) => void;
}

let volumeBeforeMute = 1;

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentStation: null,
  pendingStationId: null,
  wantsPlaying: false,
  status: "idle",
  error: null,
  volume: 1,
  reloadToken: 0,

  setPending: (stationId) => set({ pendingStationId: stationId }),

  clearPending: () => set({ pendingStationId: null }),

  play: (station) => {
    const { currentStation, status } = get();
    // Re-opening the station that is already on: keep the stream, just make sure it plays.
    if (currentStation?.id === station.id && status !== "error") {
      set({ pendingStationId: null, wantsPlaying: true });
      return;
    }
    set({
      currentStation: station,
      pendingStationId: null,
      wantsPlaying: true,
      status: "loading",
      error: null,
    });
  },

  pause: () => set({ wantsPlaying: false }),

  resume: () => set({ wantsPlaying: true }),

  togglePlayback: () => {
    const { status, wantsPlaying } = get();
    if (status === "error") {
      get().retry();
      return;
    }
    set({ wantsPlaying: !wantsPlaying });
  },

  stop: () =>
    set({
      currentStation: null,
      pendingStationId: null,
      wantsPlaying: false,
      status: "idle",
      error: null,
    }),

  retry: () =>
    set((s) => ({
      wantsPlaying: true,
      status: "loading",
      error: null,
      reloadToken: s.reloadToken + 1,
    })),

  setVolume: (volume) => set({ volume }),

  toggleMute: () => {
    const { volume } = get();
    if (volume > 0) {
      volumeBeforeMute = volume;
      set({ volume: 0 });
    } else {
      set({ volume: volumeBeforeMute || 1 });
    }
  },

  reportStatus: (status, error = null) => {
    const prev = get();
    if (prev.status === status && prev.error === error) return;
    set({ status, error });
  },
}));
