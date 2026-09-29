import { usePlayerStore } from "@/stores/usePlayerStore";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useState } from "react";

/** Give up on a stream that has not started after this long. */
const CONNECT_TIMEOUT_MS = 20000;

/**
 * Owns the single app-wide radio player. Mounted once at the root so playback
 * survives navigation; screens and the mini-player talk to it only through
 * usePlayerStore. Renders nothing.
 */
export function AudioEngine() {
  const station = usePlayerStore((s) => s.currentStation);
  const wantsPlaying = usePlayerStore((s) => s.wantsPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const reloadToken = usePlayerStore((s) => s.reloadToken);
  const reportStatus = usePlayerStore((s) => s.reportStatus);

  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const streamUrl = station?.streamUrl;
  const stationName = station?.name;
  const stationLogo = station?.logo;

  // Load a new stream when the station changes or the user retries.
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

  // Follow play/pause intent.
  useEffect(() => {
    if (!streamUrl) return;
    try {
      if (wantsPlaying) player.play();
      else player.pause();
    } catch {}
  }, [wantsPlaying, streamUrl, player]);

  useEffect(() => {
    try {
      // expo-audio only exposes volume as a settable property on the player
      // eslint-disable-next-line react-hooks/immutability
      player.volume = volume;
    } catch {}
  }, [volume, player]);

  // A load attempt that hasn't produced audio in time is treated as an error.
  // Keyed by attempt so a retry or a new station starts a fresh clock.
  const loadKey = streamUrl ? `${station?.id}:${reloadToken}` : null;
  const audible = status.playing && !status.isBuffering;
  const [timedOutKey, setTimedOutKey] = useState<string | null>(null);
  useEffect(() => {
    if (!loadKey || !wantsPlaying || audible) return;
    const t = setTimeout(() => setTimedOutKey(loadKey), CONNECT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [loadKey, wantsPlaying, audible]);
  const timedOut = timedOutKey !== null && timedOutKey === loadKey;

  // Translate native status into the app's simpler status.
  useEffect(() => {
    if (!streamUrl) {
      reportStatus("idle");
      return;
    }
    if (status.error) {
      reportStatus("error", "This station is not responding right now.");
      return;
    }
    if (!wantsPlaying) {
      reportStatus("paused");
      return;
    }
    if (audible) {
      reportStatus("playing");
      return;
    }
    if (timedOut) {
      reportStatus("error", "Couldn't connect to this station.");
      return;
    }
    reportStatus("loading");
  }, [
    streamUrl,
    wantsPlaying,
    status.error,
    audible,
    timedOut,
    reportStatus,
  ]);

  return null;
}
