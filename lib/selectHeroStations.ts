import type { Station } from "@/lib/schemas";

export const HERO_MAX_ITEMS = 5;

function hasLogo(s: Station): boolean {
  return Boolean(s.logo?.trim());
}

/**
 * Up to {@link HERO_MAX_ITEMS} stations for the hero:
 * 1. Featured with logos — TV first, radio second, then remaining featured with logos.
 * 2. If still short, any other stations with logos (from `all`, stable order).
 * 3. If still short, any remaining stations until five (or catalog runs out).
 */
export function selectHeroStations(featured: Station[], all: Station[]): Station[] {
  if (all.length === 0) return [];

  const used = new Set<string>();
  const out: Station[] = [];

  const add = (s: Station | undefined) => {
    if (!s || used.has(s.id) || out.length >= HERO_MAX_ITEMS) return;
    out.push(s);
    used.add(s.id);
  };

  const featuredWithLogo = featured.filter(hasLogo);

  add(featuredWithLogo.find((s) => s.type === "tv"));
  add(featuredWithLogo.find((s) => s.type === "radio"));
  for (const s of featuredWithLogo) {
    if (out.length >= HERO_MAX_ITEMS) break;
    add(s);
  }

  if (out.length < HERO_MAX_ITEMS) {
    for (const s of all) {
      if (out.length >= HERO_MAX_ITEMS) break;
      if (!hasLogo(s)) continue;
      add(s);
    }
  }

  if (out.length < HERO_MAX_ITEMS) {
    for (const s of all) {
      if (out.length >= HERO_MAX_ITEMS) break;
      add(s);
    }
  }

  return out;
}
