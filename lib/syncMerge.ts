import type { StationTaste, TasteProfile } from "@/lib/taste";

/** What one person's devices share through the cloud. */
export interface SyncedData {
  favourites: string[];
  recents: string[];
  taste: TasteProfile;
}

const MAX_RECENTS = 20;

function mergeStationTaste(a: StationTaste, b: StationTaste): StationTaste {
  // Max, not sum: the same history seen from two sides must not double.
  return {
    plays: Math.max(a.plays, b.plays),
    listenMs: Math.max(a.listenMs, b.listenMs),
    skips: Math.max(a.skips, b.skips),
    lastAt: Math.max(a.lastAt, b.lastAt),
    dayParts: a.dayParts.map((n, i) => Math.max(n, b.dayParts[i])) as StationTaste["dayParts"],
  };
}

/**
 * Combines this device's data with the account's the first time the device
 * signs in, so nothing from either side is lost. Later syncs replace instead
 * (latest change wins), which lets removals carry across devices.
 */
export function mergeFirstSync(local: SyncedData, remote: SyncedData): SyncedData {
  const favourites = [...new Set([...remote.favourites, ...local.favourites])];
  const recents = [...new Set([...local.recents, ...remote.recents])].slice(0, MAX_RECENTS);

  const stations: TasteProfile["stations"] = { ...remote.taste.stations };
  for (const [id, t] of Object.entries(local.taste.stations)) {
    stations[id] = stations[id] ? mergeStationTaste(stations[id], t) : t;
  }
  const taste = { stations, updatedAt: Math.max(local.taste.updatedAt, remote.taste.updatedAt) };

  return { favourites, recents, taste };
}

/** Accepts only well-formed data from the cloud; anything else counts as empty. */
export function parseRemote(row: { favourites?: unknown; recents?: unknown; taste?: unknown }): SyncedData {
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const taste = row.taste as Partial<TasteProfile> | undefined;
  return {
    favourites: ids(row.favourites),
    recents: ids(row.recents),
    taste: {
      stations: taste && typeof taste.stations === "object" && taste.stations ? taste.stations : {},
      updatedAt: typeof taste?.updatedAt === "number" ? taste.updatedAt : 0,
    },
  };
}
