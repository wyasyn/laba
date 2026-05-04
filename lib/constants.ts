/**
 * Pre-validated stations JSON, built and published automatically by GitHub Actions.
 * See station-builder/ and .github/workflows/build-stations.yml.
 *
 * Published on the custom domain (GitHub Pages gh-pages branch).
 */
export const STATIONS_URL = "https://laba.yasinwalum.com/stations.json";

export const CACHE_KEYS = {
  STATIONS: "@laba/stations",
  STATIONS_TIMESTAMP: "@laba/stations_timestamp",
  FAVOURITES: "@laba/favourites",
  THEME_MODE: "@laba/theme_mode",
} as const;

// 24 hours in milliseconds
export const CACHE_TTL = 24 * 60 * 60 * 1000;
