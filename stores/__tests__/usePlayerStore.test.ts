import { station } from "@/lib/__tests__/fixtures";
import { usePlayerStore } from "@/stores/usePlayerStore";

const initial = usePlayerStore.getState();
const cbs = station({ id: "cbs" });
const kfm = station({ id: "kfm" });

beforeEach(() => {
  usePlayerStore.setState(initial, true);
});

describe("usePlayerStore", () => {
  it("play loads a new station and asks for a fresh stream", () => {
    usePlayerStore.getState().play(cbs);
    const s = usePlayerStore.getState();
    expect(s.currentStation?.id).toBe("cbs");
    expect(s.wantsPlaying).toBe(true);
    expect(s.status).toBe("loading");
    expect(s.reloadToken).toBe(initial.reloadToken + 1);
  });

  it("re-opening the station that is on keeps the stream", () => {
    const { play, reportStatus } = usePlayerStore.getState();
    play(cbs);
    reportStatus("playing");
    const token = usePlayerStore.getState().reloadToken;
    play(cbs);
    expect(usePlayerStore.getState().reloadToken).toBe(token);
    play(kfm);
    expect(usePlayerStore.getState().reloadToken).toBe(token + 1);
  });

  it("toggle retries from an error and resets the reconnect count", () => {
    const { play, reconnect, reportStatus, togglePlayback } = usePlayerStore.getState();
    play(cbs);
    reconnect();
    reconnect();
    reportStatus("error", "gone");
    togglePlayback();
    const s = usePlayerStore.getState();
    expect(s.status).toBe("loading");
    expect(s.error).toBeNull();
    expect(s.reconnectAttempt).toBe(0);
  });

  it("a stream that plays again gets a full set of retries", () => {
    const { play, reconnect, reportStatus } = usePlayerStore.getState();
    play(cbs);
    reconnect();
    expect(usePlayerStore.getState().reconnectAttempt).toBe(1);
    reportStatus("playing");
    expect(usePlayerStore.getState().reconnectAttempt).toBe(0);
  });

  it("after an interruption a tap means play, not pause", () => {
    const { play, setInterrupted, togglePlayback } = usePlayerStore.getState();
    play(cbs);
    setInterrupted(true);
    togglePlayback();
    const s = usePlayerStore.getState();
    expect(s.wantsPlaying).toBe(true);
    expect(s.interrupted).toBe(false);
  });

  it("sets and clears the sleep timer, and stop clears it", () => {
    jest.spyOn(Date, "now").mockReturnValue(1_000_000);
    const { play, setSleepTimer, stop } = usePlayerStore.getState();
    play(cbs);
    setSleepTimer(30);
    expect(usePlayerStore.getState().sleepUntil).toBe(1_000_000 + 30 * 60_000);
    setSleepTimer(null);
    expect(usePlayerStore.getState().sleepUntil).toBeNull();
    setSleepTimer(15);
    stop();
    expect(usePlayerStore.getState().sleepUntil).toBeNull();
    expect(usePlayerStore.getState().currentStation).toBeNull();
    jest.restoreAllMocks();
  });

  it("mute remembers the volume to restore", () => {
    const { setVolume, toggleMute } = usePlayerStore.getState();
    setVolume(0.4);
    toggleMute();
    expect(usePlayerStore.getState().volume).toBe(0);
    toggleMute();
    expect(usePlayerStore.getState().volume).toBe(0.4);
  });
});
