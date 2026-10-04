import type { Station } from "@/lib/schemas";

function hasLogo(s: Station): boolean {
  return Boolean(s.logo?.trim());
}

/**
 * Takes one item from each group in turn until `limit` items are taken or
 * every group is empty. Groups keep their own order.
 */
function roundRobin<T>(groups: T[][], limit: number): T[] {
  const out: T[] = [];
  const queues = groups.map((g) => [...g]);
  while (out.length < limit && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const next = q.shift();
      if (next !== undefined && out.length < limit) out.push(next);
    }
  }
  return out;
}

function groupBy(stations: Station[], key: (s: Station) => string): Station[][] {
  const groups = new Map<string, Station[]>();
  for (const s of stations) {
    const k = key(s);
    const g = groups.get(k);
    if (g) g.push(s);
    else groups.set(k, [s]);
  }
  return [...groups.values()];
}

/**
 * Featured stations for the Home row: those with logos first (they read best
 * as tiles), alternating TV and radio so neither crowds out the other.
 */
export function rankFeatured(featured: Station[], limit: number): Station[] {
  const ordered = [...featured.filter(hasLogo), ...featured.filter((s) => !hasLogo(s))];
  return roundRobin(
    [ordered.filter((s) => s.type === "tv"), ordered.filter((s) => s.type === "radio")],
    limit,
  );
}

/**
 * A varied taste of the international list: alternates TV and radio, and
 * within each type cycles through countries so one country cannot fill the
 * section (the list is grouped by type, so taking the first few gave TV only).
 */
export function mixInternational(stations: Station[], limit: number): Station[] {
  const byCountry = (type: Station["type"]) =>
    roundRobin(
      groupBy(
        stations.filter((s) => s.type === type),
        (s) => s.country,
      ),
      limit,
    );
  return roundRobin([byCountry("tv"), byCountry("radio")], limit);
}
