import { SKIP_MS } from "@/lib/taste";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useTasteStore } from "@/stores/useTasteStore";
import { AppState } from "react-native";

/**
 * Feeds radio listening time into the taste engine. Radio plays in the global
 * engine after its screen closes, so time is measured from the player state,
 * not the screen. A station that played for less than SKIP_MS in total before
 * the person moved on counts as a skip. Returns an unsubscribe function.
 */
export function watchListening() {
  let stationId: string | null = null;
  let playingSince: number | null = null;
  let totalMs = 0;

  const flush = () => {
    if (stationId === null || playingSince === null) return;
    const now = Date.now();
    totalMs += now - playingSince;
    useTasteStore.getState().recordListen(stationId, now - playingSince);
    playingSince = now;
  };

  const endVisit = () => {
    flush();
    if (stationId !== null && totalMs < SKIP_MS) useTasteStore.getState().recordSkip(stationId);
    stationId = null;
    playingSince = null;
    totalMs = 0;
  };

  const unsubscribePlayer = usePlayerStore.subscribe((state, prev) => {
    const nextId = state.currentStation?.id ?? null;
    if (nextId !== (prev.currentStation?.id ?? null)) {
      endVisit();
      stationId = nextId;
    }
    const playing = state.status === "playing" && state.wantsPlaying;
    if (playing && playingSince === null) playingSince = Date.now();
    else if (!playing && playingSince !== null) {
      flush();
      playingSince = null;
    }
  });

  // Save what has been heard so far, so a killed app loses at most a minute.
  const appState = AppState.addEventListener("change", (next) => {
    if (next !== "active") flush();
  });
  const timer = setInterval(flush, 60_000);

  return () => {
    unsubscribePlayer();
    appState.remove();
    clearInterval(timer);
  };
}
