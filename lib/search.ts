import type { Station } from "@/lib/schemas";

/** Case-insensitive match on name, description and categories. */
export function matchesQuery(s: Station, query: string) {
  const t = query.toLowerCase().trim();
  if (!t) return true;
  return (
    s.name.toLowerCase().includes(t) ||
    s.description.toLowerCase().includes(t) ||
    s.categories.some((c) => c.toLowerCase().includes(t))
  );
}

/** The most common categories across `stations`, most frequent first. */
export function topCategories(stations: Station[], limit = 8) {
  const counts = new Map<string, number>();
  for (const s of stations) {
    for (const c of s.categories) {
      const key = c.trim().toLowerCase();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([c]) => c);
}

export function hasCategory(s: Station, category: string) {
  return s.categories.some((c) => c.trim().toLowerCase() === category);
}

const COUNTRY_NAMES: Record<string, string> = {
  AE: "UAE",
  AU: "Australia",
  AZ: "Azerbaijan",
  BE: "Belgium",
  BR: "Brazil",
  CA: "Canada",
  CD: "DR Congo",
  CH: "Switzerland",
  CN: "China",
  DE: "Germany",
  ES: "Spain",
  ET: "Ethiopia",
  FR: "France",
  GB: "United Kingdom",
  GH: "Ghana",
  IN: "India",
  IT: "Italy",
  JP: "Japan",
  KE: "Kenya",
  KR: "South Korea",
  LU: "Luxembourg",
  MU: "Mauritius",
  NG: "Nigeria",
  NL: "Netherlands",
  QA: "Qatar",
  RO: "Romania",
  RU: "Russia",
  RW: "Rwanda",
  SA: "Saudi Arabia",
  SS: "South Sudan",
  TR: "Turkey",
  TZ: "Tanzania",
  UG: "Uganda",
  US: "United States",
  ZA: "South Africa",
};

/** Readable country name for an ISO code; unknown codes are shown as-is. */
export function countryName(code: string) {
  return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

/**
 * A station's languages, normalised: the catalogue mixes case, joins several
 * with commas ("english,french") and has regional variants ("english uk").
 */
export function languagesOf(s: Station) {
  return s.language
    .split(",")
    .map((l) => l.trim().toLowerCase().replace(/^english .*/, "english"))
    .filter(Boolean);
}

/** "bahasa indonesia" → "Bahasa Indonesia". */
export function languageName(language: string) {
  return language.replace(/\b\w/g, (c) => c.toUpperCase());
}

function rankBy(stations: Station[], keysOf: (s: Station) => string[], limit: number) {
  const counts = new Map<string, number>();
  for (const s of stations) {
    for (const k of new Set(keysOf(s))) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([k]) => k);
}

/** Countries in `stations`, most stations first. */
export function topCountries(stations: Station[], limit = 12) {
  return rankBy(stations, (s) => [s.country.toUpperCase()], limit);
}

/** Languages in `stations`, most stations first. */
export function topLanguages(stations: Station[], limit = 12) {
  return rankBy(stations, languagesOf, limit);
}

export interface StationFilters {
  country: string | null;
  language: string | null;
}

export function matchesFilters(s: Station, { country, language }: StationFilters) {
  if (country !== null && s.country.toUpperCase() !== country) return false;
  if (language !== null && !languagesOf(s).includes(language)) return false;
  return true;
}
