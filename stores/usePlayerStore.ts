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
  /** True while `loading` is the engine recovering a stream that dropped, not a first connect. */
  reconnecting: boolean;
  /**
   * True while the system has paused playback (a phone call, another app taking
   * audio focus, the lock-screen controls). The OS resumes it on its own when
   * the interruption ends, so the engine leaves the player alone meanwhile.
   */
  interrupted: boolean;
  volume: number;
  /** Bumped on every new load attempt (play or retry) so the engine reloads the stream. */
  reloadToken: number;
  /** Automatic reload attempts since the stream last played. Reset by a user retry. */
  reconnectAttempt: number;

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
  reportStatus: (status: PlaybackStatus, error?: string | null, reconnecting?: boolean) => void;
  /** Engine only: reload the stream after it dropped, counting the attempt. */
  reconnect: () => void;
  /** Engine only: the system paused or resumed playback behind our back. */
  setInterrupted: (interrupted: boolean) => void;
}

let volumeBeforeMute = 1;

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentStation: null,
  pendingStationId: null,
  wantsPlaying: false,
  status: "idle",
  error: null,
  reconnecting: false,
  interrupted: false,
  volume: 1,
  reloadToken: 0,
  reconnectAttempt: 0,

  setPending: (stationId) => set({ pendingStationId: stationId }),

  clearPending: () => set({ pendingStationId: null }),

  play: (station) => {
    const { currentStation, status } = get();
    // Re-opening the station that is already on: keep the stream, just make sure it plays.
    if (currentStation?.id === station.id && status !== "error") {
      set({ pendingStationId: null, wantsPlaying: true, interrupted: false });
      return;
    }
    // A fresh attempt token, so reopening a station that previously timed out gets
    // its own connect window instead of inheriting the old timeout.
    set((s) => ({
      currentStation: station,
      pendingStationId: null,
      wantsPlaying: true,
      status: "loading",
      error: null,
      reconnecting: false,
      interrupted: false,
      reloadToken: s.reloadToken + 1,
      reconnectAttempt: 0,
    }));
  },

  pause: () => set({ wantsPlaying: false, interrupted: false }),

  resume: () => set({ wantsPlaying: true, interrupted: false }),

  togglePlayback: () => {
    const { status, wantsPlaying, interrupted } = get();
    if (status === "error") {
      get().retry();
      return;
    }
    // After an interruption the user still "wants" playback, but hears nothing,
    // so a tap means play.
    if (interrupted) {
      set({ wantsPlaying: true, interrupted: false });
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
      reconnecting: false,
      interrupted: false,
      reconnectAttempt: 0,
    }),

  retry: () =>
    set((s) => ({
      wantsPlaying: true,
      status: "loading",
      error: null,
      reconnecting: false,
      interrupted: false,
      reloadToken: s.reloadToken + 1,
      reconnectAttempt: 0,
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

  reportStatus: (status, error = null, reconnecting = false) => {
    const prev = get();
    // A stream that plays again has recovered, so the next drop gets a full set of retries.
    const reconnectAttempt = status === "playing" ? 0 : prev.reconnectAttempt;
    if (
      prev.status === status &&
      prev.error === error &&
      prev.reconnecting === reconnecting &&
      prev.reconnectAttempt === reconnectAttempt
    ) {
      return;
    }
    set({ status, error, reconnecting, reconnectAttempt });
  },

  reconnect: () =>
    set((s) => ({
      reloadToken: s.reloadToken + 1,
      reconnectAttempt: s.reconnectAttempt + 1,
    })),

  setInterrupted: (interrupted) => {
    if (get().interrupted !== interrupted) set({ interrupted });
  },
}));
