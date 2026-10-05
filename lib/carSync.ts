import { t } from "@/lib/i18n";
import { LabaAuto, type CarLibrary } from "@/modules/laba-auto";
import { useFavouritesStore } from "@/stores/useFavouritesStore";
import { useLocaleStore } from "@/stores/useLocaleStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useRecentsStore } from "@/stores/useRecentsStore";
import { useStationStore } from "@/stores/useStationStore";

/** Coalesce the burst of store updates at startup into one write. */
const SYNC_DELAY_MS = 1000;

function buildLibrary(): CarLibrary {
  const stations = useStationStore.getState().radioStations.flatMap((s) =>
    s.streamUrl
      ? [{ id: s.id, name: s.name, type: "radio" as const, logo: s.logo, streamUrl: s.streamUrl, categories: s.categories }]
      : [],
  );
  return {
    stations,
    favourites: useFavouritesStore.getState().ids,
    recents: useRecentsStore.getState().ids,
    labels: {
      favourites: t("favourites.title"),
      recent: t("car.recent"),
      stations: t("car.stations"),
      categories: t("car.categories"),
      live: t("player.lockScreenSubtitle"),
    },
  };
}

/**
 * Keeps Android Auto's station list in step with the app (stations,
 * favourites, recents, language), and stops the app's player when a station
 * is started from the car. Call once at startup; returns the unsubscribe.
 * Does nothing where the native module is missing (iOS, web).
 */
export function watchCarLibrary() {
  const auto = LabaAuto;
  if (!auto) return () => {};

  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      // Nothing worth sending until the catalogue has loaded.
      if (useStationStore.getState().radioStations.length === 0) return;
      auto.syncLibrary(JSON.stringify(buildLibrary())).catch(() => {});
    }, SYNC_DELAY_MS);
  };

  const unsubscribers = [
    useStationStore.subscribe((s, prev) => s.radioStations !== prev.radioStations && schedule()),
    useFavouritesStore.subscribe((s, prev) => s.ids !== prev.ids && schedule()),
    useRecentsStore.subscribe((s, prev) => s.ids !== prev.ids && schedule()),
    useLocaleStore.subscribe((s, prev) => s.locale !== prev.locale && schedule()),
  ];
  const carPlayback = auto.addListener("onCarPlaybackStart", () => usePlayerStore.getState().stop());
  schedule();

  return () => {
    if (timer) clearTimeout(timer);
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    carPlayback.remove();
  };
}
