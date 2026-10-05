// Downloads the live station catalog and writes it to
// data/fallback-stations.json, the copy bundled with the app for first
// launches without a network. Run before every release build:
//
//   pnpm stations:snapshot

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { STATIONS_URL } from "../lib/constants.ts";
import { stationsArraySchema } from "../lib/schemas.ts";

const OUT_PATH = fileURLToPath(
  new URL("../data/fallback-stations.json", import.meta.url)
);

const res = await fetch(STATIONS_URL);
if (!res.ok) {
  throw new Error(`Failed to download ${STATIONS_URL}: HTTP ${res.status}`);
}

const stations = stationsArraySchema.parse(await res.json());

const counts = { tv: 0, radio: 0 };
for (const s of stations) counts[s.type]++;

// An empty type would leave a tab blank offline, so refuse to write it.
if (counts.tv === 0 || counts.radio === 0) {
  throw new Error(
    `Refusing to write snapshot: ${counts.tv} TV and ${counts.radio} radio stations`
  );
}

await writeFile(OUT_PATH, JSON.stringify(stations, null, 2) + "\n");
console.log(
  `Wrote ${stations.length} stations (${counts.tv} TV, ${counts.radio} radio) to data/fallback-stations.json`
);
