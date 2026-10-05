import { SITE_URL } from "@/lib/constants";
import { t } from "@/lib/i18n";
import type { Station } from "@/lib/schemas";
import { Share } from "react-native";

export function stationUrl(id: string) {
  return `${SITE_URL}/station/${encodeURIComponent(id)}`;
}

/** Opens the system share sheet with a link that opens the station in Laba. */
export async function shareStation(station: Station) {
  const url = stationUrl(station.id);
  try {
    await Share.share(
      // iOS shows `url` as a rich link and keeps `message` as the text; Android
      // only sends `message`, so the link has to be in it.
      { message: t(station.type === "tv" ? "share.tv" : "share.radio", { name: station.name, url }), url, title: station.name },
      { dialogTitle: t("share.dialog", { name: station.name }) },
    );
  } catch {}
}
