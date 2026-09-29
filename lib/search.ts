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
