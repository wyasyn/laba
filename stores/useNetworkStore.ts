import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { create } from "zustand";
import { usePlayerStore } from "./usePlayerStore";
import { useStationStore } from "./useStationStore";

interface NetworkStore {
  /** Optimistic: true until NetInfo says otherwise, so a slow first check never blocks anything. */
  isOnline: boolean;
}

export const useNetworkStore = create<NetworkStore>(() => ({ isOnline: true }));

/** Unknown reachability (null) counts as online; only a definite "no" is offline. */
function isOnline(state: NetInfoState) {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

/** When the connection comes back, pick up whatever failed while it was gone. */
function recover() {
  if (useStationStore.getState().error) void useStationStore.getState().refreshStations();

  const player = usePlayerStore.getState();
  if (player.currentStation && player.wantsPlaying && player.status !== "playing") player.retry();
}

/**
 * Starts following connectivity. Call once at startup; returns the unsubscribe.
 */
export function watchNetwork() {
  return NetInfo.addEventListener((state) => {
    const online = isOnline(state);
    const wasOnline = useNetworkStore.getState().isOnline;
    if (online === wasOnline) return;
    useNetworkStore.setState({ isOnline: online });
    if (online) recover();
  });
}
