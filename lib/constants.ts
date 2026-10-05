/**
 * Pre-validated stations JSON, built and published automatically by GitHub Actions.
 * See station-builder/ and .github/workflows/build-stations.yml.
 *
 * Published on the custom domain (GitHub Pages gh-pages branch).
 */
export const STATIONS_URL = "https://laba.yasinwalum.com/stations.json";

/** Public site. Station links (`/station/<id>`) open the app when installed. */
export const SITE_URL = "https://laba.yasinwalum.com";

export const SUPPORT_EMAIL = "ywalum@gmail.com";

export const CACHE_KEYS = {
  STATIONS: "@laba/stations",
  STATIONS_TIMESTAMP: "@laba/stations_timestamp",
  FAVOURITES: "@laba/favourites",
  RECENTS: "@laba/recents",
  THEME_MODE: "@laba/theme_mode",
} as const;

// 24 hours in milliseconds
export const CACHE_TTL = 24 * 60 * 60 * 1000;
