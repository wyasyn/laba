import { roundRobin } from "@/lib/homeSections";
import type { Station } from "@/lib/schemas";

/**
 * On-device taste engine. Keeps a small per-station tally of what the person
 * opens and listens to, and turns it into Home rows. Pure functions only, so
 * the store, Home and tests share them; nothing here leaves the device.
 */

/** Morning (5-12), afternoon (12-17), evening (17-22), night (22-5). */
export type DayPart = 0 | 1 | 2 | 3;

export interface StationTaste {
  /** Times opened (repeat opens within a few minutes count once). */
  plays: number;
  /** Total time spent listening or watching. */
  listenMs: number;
  /** Times opened and left again almost at once. */
  skips: number;
  /** Last time opened, ms since epoch. */
  lastAt: number;
  /** Opens per part of the day, indexed by DayPart. */
  dayParts: [number, number, number, number];
}

export interface TasteProfile {
  stations: Record<string, StationTaste>;
  /** Last change, ms since epoch. */
  updatedAt: number;
}

export const EMPTY_PROFILE: TasteProfile = { stations: {}, updatedAt: 0 };

/** A visit shorter than this counts as a skip. */
export const SKIP_MS = 15_000;
/** Opening the same station again within this window is the same visit. */
const SAME_VISIT_MS = 10 * 60_000;
/** Interest halves every two weeks without listening. */
const HALF_LIFE_MS = 14 * 24 * 60 * 60_000;
/** A favourite is a strong, lasting signal. */
const FAVOURITE_BOOST = 3;
/** Below this the profile is too thin to recommend from. */
const MIN_SIGNAL = 3;

export function dayPartOf(time: number): DayPart {
  const hour = new Date(time).getHours();
  if (hour >= 5 && hour < 12) return 0;
  if (hour >= 12 && hour < 17) return 1;
  if (hour >= 17 && hour < 22) return 2;
  return 3;
}

function entry(profile: TasteProfile, id: string): StationTaste {
  return profile.stations[id] ?? { plays: 0, listenMs: 0, skips: 0, lastAt: 0, dayParts: [0, 0, 0, 0] };
}

function withEntry(profile: TasteProfile, id: string, next: StationTaste, now: number): TasteProfile {
  return { stations: { ...profile.stations, [id]: next }, updatedAt: now };
}

export function recordOpen(profile: TasteProfile, id: string, now: number): TasteProfile {
  const prev = entry(profile, id);
  if (now - prev.lastAt < SAME_VISIT_MS) return withEntry(profile, id, { ...prev, lastAt: now }, now);
  const dayParts = [...prev.dayParts] as StationTaste["dayParts"];
  dayParts[dayPartOf(now)] += 1;
  return withEntry(profile, id, { ...prev, plays: prev.plays + 1, lastAt: now, dayParts }, now);
}

export function recordListen(profile: TasteProfile, id: string, ms: number, now: number): TasteProfile {
  if (ms <= 0) return profile;
  const prev = entry(profile, id);
  return withEntry(profile, id, { ...prev, listenMs: prev.listenMs + ms }, now);
}

export function recordSkip(profile: TasteProfile, id: string, now: number): TasteProfile {
  const prev = entry(profile, id);
  return withEntry(profile, id, { ...prev, skips: prev.skips + 1 }, now);
}

/**
 * Direct interest in each station the person has used: opens and (log-scaled)
 * listening time, minus skips, fading with age, raised for the stations they
 * use at this time of day. Favourites always count.
 */
export function stationScores(profile: TasteProfile, favourites: string[], now: number): Map<string, number> {
  const part = dayPartOf(now);
  const scores = new Map<string, number>();
  for (const [id, s] of Object.entries(profile.stations)) {
    const engagement = s.plays + 2 * Math.log1p(s.listenMs / 60_000) - 0.75 * s.skips;
    if (engagement <= 0) continue;
    const decay = Math.pow(0.5, Math.max(0, now - s.lastAt) / HALF_LIFE_MS);
    const timeOfDay = 1 + (s.plays > 0 ? s.dayParts[part] / s.plays : 0);
    scores.set(id, engagement * decay * timeOfDay);
  }
  for (const id of favourites) scores.set(id, (scores.get(id) ?? 0) + FAVOURITE_BOOST);
  return scores;
}

interface Affinities {
  categories: Map<string, number>;
  languages: Map<string, number>;
  countries: Map<string, number>;
  types: Map<string, number>;
  /** Sum of all direct scores; how much there is to go on. */
  signal: number;
}

function add(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) ?? 0) + value);
}

/** Shares of interest per category, language, country and type, each summing to 1. */
function affinities(stations: Station[], scores: Map<string, number>): Affinities {
  const a: Affinities = { categories: new Map(), languages: new Map(), countries: new Map(), types: new Map(), signal: 0 };
  for (const s of stations) {
    const score = scores.get(s.id);
    if (!score) continue;
    a.signal += score;
    for (const c of s.categories) add(a.categories, c, score / s.categories.length);
    add(a.languages, s.language, score);
    add(a.countries, s.country, score);
    add(a.types, s.type, score);
  }
  for (const map of [a.categories, a.languages, a.countries, a.types]) {
    const total = [...map.values()].reduce((x, y) => x + y, 0);
    for (const [k, v] of map) map.set(k, v / total);
  }
  return a;
}

/** How well a station matches the person's taste, without counting their own use of it. */
function similarity(s: Station, a: Affinities): number {
  const category = Math.max(0, ...s.categories.map((c) => a.categories.get(c) ?? 0));
  return (
    3 * category +
    (a.languages.get(s.language) ?? 0) +
    (a.countries.get(s.country) ?? 0) +
    (a.types.get(s.type) ?? 0)
  );
}

export interface PersonalRows {
  /** Stations they use most, best for this time of day first. */
  jumpBackIn: Station[];
  /** The category they like most, with stations from it they haven't settled on. */
  topCategory: { name: string; stations: Station[] } | null;
  /** Stations like the ones they use, across their other interests. */
  forYou: Station[];
}

const NO_ROWS: PersonalRows = { jumpBackIn: [], topCategory: null, forYou: [] };

/** Builds the personal Home rows. Every row is empty until there is enough to go on. */
export function personalRows(
  stations: Station[],
  profile: TasteProfile,
  favourites: string[],
  now: number,
  limit: number,
): PersonalRows {
  const scores = stationScores(profile, favourites, now);
  const a = affinities(stations, scores);
  if (a.signal < MIN_SIGNAL) return NO_ROWS;

  const jumpBackIn = stations
    .filter((s) => (scores.get(s.id) ?? 0) > 0)
    .sort((x, y) => scores.get(y.id)! - scores.get(x.id)!)
    .slice(0, limit);
  const shown = new Set(jumpBackIn.map((s) => s.id));

  // Fresh picks only: nothing already in Jump back in, nothing mostly skipped.
  const fresh = stations.filter((s) => {
    if (shown.has(s.id)) return false;
    const t = profile.stations[s.id];
    return !t || t.skips <= t.plays;
  });
  const bySimilarity = (list: Station[]) =>
    list
      .map((s) => ({ s, score: similarity(s, a) }))
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score)
      .map((x) => x.s);

  const [bestCategory] = [...a.categories.entries()].sort((x, y) => y[1] - x[1]);
  let topCategory: PersonalRows["topCategory"] = null;
  if (bestCategory) {
    const inCategory = bySimilarity(fresh.filter((s) => s.categories.includes(bestCategory[0])));
    if (inCategory.length > 0) topCategory = { name: bestCategory[0], stations: inCategory.slice(0, limit) };
  }

  // Other interests, grouped by first category and interleaved so no single
  // category fills the row.
  const elsewhere = bySimilarity(fresh.filter((s) => !topCategory || !s.categories.includes(topCategory.name)));
  const groups = new Map<string, Station[]>();
  for (const s of elsewhere) {
    const key = s.categories[0] ?? "";
    const g = groups.get(key);
    if (g) g.push(s);
    else groups.set(key, [s]);
  }
  const forYou = roundRobin([...groups.values()], limit);

  return { jumpBackIn, topCategory, forYou };
}
