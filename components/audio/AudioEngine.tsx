import { useNetworkStore } from "@/stores/useNetworkStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useRef, useState } from "react";

/** Treat a load attempt that has not produced audio after this long as failed. */
const CONNECT_TIMEOUT_MS = 15000;

/**
 * Wait before each automatic reload of a failed stream. The error is only
 * shown once every attempt has failed.
 */
const RETRY_DELAYS_MS = [2000, 5000, 10000];

/**
 * Owns the single app-wide radio player. Mounted once at the root so playback
 * survives navigation; screens and the mini-player talk to it only through
 * usePlayerStore. Renders nothing.
 */
export function AudioEngine() {
  const station = usePlayerStore((s) => s.currentStation);
  const wantsPlaying = usePlayerStore((s) => s.wantsPlaying);
  const interrupted = usePlayerStore((s) => s.interrupted);
  const volume = usePlayerStore((s) => s.volume);
  const reloadToken = usePlayerStore((s) => s.reloadToken);
  const reconnectAttempt = usePlayerStore((s) => s.reconnectAttempt);
  const reportStatus = usePlayerStore((s) => s.reportStatus);
  const reconnect = usePlayerStore((s) => s.reconnect);
  const setInterrupted = usePlayerStore((s) => s.setInterrupted);
  const isOnline = useNetworkStore((s) => s.isOnline);

  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const streamUrl = station?.streamUrl;
  const stationId = station?.id;
  const stationName = station?.name;
  const stationLogo = station?.logo;

  // Load a new stream when the station changes, the user retries, or the
  // engine reconnects.
  useEffect(() => {
    if (!streamUrl) {
      try {
        player.pause();
        player.clearLockScreenControls();
      } catch {}
      return;
    }
    try {
      player.replace({ uri: streamUrl });
      player.play();
      player.setActiveForLockScreen(true, {
        title: stationName,
        artist: "Laba · Live radio",
        artworkUrl: stationLogo,
      });
    } catch (e) {
      reportStatus("error", e instanceof Error ? e.message : "Stream failed to load");
    }
  }, [streamUrl, reloadToken, player, stationName, stationLogo, reportStatus]);

  // Follow play/pause intent. While interrupted the OS owns the player and
  // resumes it itself; calling pause() here would cancel that.
  useEffect(() => {
    if (!streamUrl || interrupted) return;
    try {
      if (wantsPlaying) player.play();
      else player.pause();
    } catch {}
  }, [wantsPlaying, interrupted, streamUrl, player]);

  useEffect(() => {
    try {
      // expo-audio only exposes volume as a settable property on the player
      // eslint-disable-next-line react-hooks/immutability
      player.volume = volume;
    } catch {}
  }, [volume, player]);

  const audible = status.playing && !status.isBuffering;
  const ended = status.playbackState === "ended" || status.didJustFinish;
  // "ready" on Android, "readyToPlay" on iOS: the stream is loaded and healthy.
  const ready = status.playbackState === "ready" || status.playbackState === "readyToPlay";

  // Spot the system pausing a stream we were playing: still loaded and
  // healthy, just not playing. A pause from our own UI flips wantsPlaying
  // first, so it never counts.
  const wasAudible = useRef(false);
  useEffect(() => {
    const was = wasAudible.current;
    wasAudible.current = audible;
    if (!streamUrl) return;
    if (audible) {
      setInterrupted(false);
    } else if (was && wantsPlaying && ready && !status.isBuffering && !status.error) {
      setInterrupted(true);
    }
  }, [audible, streamUrl, wantsPlaying, ready, status.isBuffering, status.error, setInterrupted]);

  // Which station has been heard since it was loaded, so a later stall reads
  // as "reconnecting" rather than a first connect.
  const [heardStationId, setHeardStationId] = useState<string | null>(null);
  if (audible && stationId && heardStationId !== stationId) setHeardStationId(stationId);
  if (!stationId && heardStationId !== null) setHeardStationId(null);

  // Failures are latched per load attempt, on the moment they appear: native
  // error fields are cleared by the next status tick, and the previous
  // attempt's error is still in `status` for a render after a reload.
  const loadKey = streamUrl ? `${stationId}:${reloadToken}` : null;
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const failure = status.error || ended ? `${status.error ?? "ended"}` : null;
  const [lastFailure, setLastFailure] = useState<string | null>(null);
  if (failure !== lastFailure) {
    setLastFailure(failure);
    if (failure && loadKey) setFailedKey(loadKey);
  }

  // A load attempt that hasn't produced audio in time has failed too.
  useEffect(() => {
    if (!loadKey || !wantsPlaying || interrupted || audible) return;
    const t = setTimeout(() => setFailedKey(loadKey), CONNECT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [loadKey, wantsPlaying, interrupted, audible]);
  const failed = loadKey !== null && failedKey === loadKey;

  // Reload a failed stream with backoff until the attempts run out. Offline
  // there is nothing to reach; the network watcher retries once it is back.
  const canRetry = reconnectAttempt < RETRY_DELAYS_MS.length;
  useEffect(() => {
    if (!failed || !wantsPlaying || interrupted || !canRetry || !isOnline) return;
    const t = setTimeout(reconnect, RETRY_DELAYS_MS[reconnectAttempt]);
    return () => clearTimeout(t);
  }, [failed, wantsPlaying, interrupted, canRetry, isOnline, reconnectAttempt, reconnect]);

  // Translate native status into the app's simpler status.
  const reconnecting = reconnectAttempt > 0 || (stationId !== undefined && heardStationId === stationId);
  useEffect(() => {
    if (!streamUrl) {
      reportStatus("idle");
      return;
    }
    if (interrupted || !wantsPlaying) {
      reportStatus("paused");
      return;
    }
    if (audible) {
      reportStatus("playing");
      return;
    }
    // Whatever is still buffered keeps playing above; once it runs out, say
    // why straight away instead of waiting for the connect timeout.
    if (!isOnline) {
      reportStatus("error", "You're offline.");
      return;
    }
    if (failed && !canRetry) {
      reportStatus("error", "This station is not responding right now.");
      return;
    }
    reportStatus("loading", null, reconnecting);
  }, [streamUrl, wantsPlaying, interrupted, audible, isOnline, failed, canRetry, reconnecting, reportStatus]);

  return null;
}
