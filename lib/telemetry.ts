import type { Station } from "@/lib/schemas";
import * as Sentry from "@sentry/react-native";
import type { ComponentType } from "react";

/**
 * Crash and stream-failure reporting through Sentry. Off unless the build
 * sets EXPO_PUBLIC_SENTRY_DSN, so local and forked builds send nothing.
 * No personal data: no user id, IP or device name (see docs/privacy.md).
 */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const telemetryEnabled = Boolean(DSN) && !__DEV__;

export function initTelemetry() {
  if (!telemetryEnabled) return;
  Sentry.init({
    dsn: DSN,
    sendDefaultPii: false,
    // Crashes and the stream failures below only; no performance tracing.
    tracesSampleRate: 0,
  });
}

/** Wraps the root component so render crashes are reported. No-op when off. */
export function withTelemetry(Root: ComponentType<Record<string, unknown>>) {
  return telemetryEnabled ? Sentry.wrap(Root) : Root;
}

/**
 * A station that would not play after every retry. Grouped by station so
 * the dashboard shows which streams fail in the field.
 */
export function logStreamFailure(station: Station, error: string) {
  if (!telemetryEnabled) return;
  Sentry.captureMessage(`Stream failed: ${station.id}`, {
    level: "warning",
    fingerprint: ["stream-failure", station.id],
    tags: { station_id: station.id, station_type: station.type },
    extra: { streamUrl: station.streamUrl, youtubeChannelId: station.youtubeChannelId, error },
  });
}
