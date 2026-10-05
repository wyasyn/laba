import { SUPPORT_EMAIL } from "@/lib/constants";
import type { Station } from "@/lib/schemas";
import Constants from "expo-constants";
import { Alert, Linking, Platform } from "react-native";

/**
 * Opens a prefilled email reporting a station that doesn't play. v1 of
 * stream reporting: the details we need to reproduce it, no backend.
 */
export async function reportStation(station: Station, error?: string | null) {
  const subject = `Laba: problem with ${station.name}`;
  const body = [
    "What went wrong? (optional)",
    "",
    "",
    "---",
    `Station: ${station.name}`,
    `Station ID: ${station.id}`,
    `Type: ${station.type}`,
    `Stream: ${station.streamUrl ?? (station.youtubeChannelId ? `YouTube ${station.youtubeChannelId}` : "none")}`,
    error ? `Error: ${error}` : null,
    `App version: ${Constants.expoConfig?.version ?? "unknown"}`,
    `Platform: ${Platform.OS} ${Platform.Version}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("No email app found", `Send the details to ${SUPPORT_EMAIL} and we'll take a look.`);
  }
}
