import { mergeFirstSync, parseRemote, type SyncedData } from "@/lib/syncMerge";
import type { StationTaste } from "@/lib/taste";

function taste(overrides: Partial<StationTaste>): StationTaste {
  return { plays: 0, listenMs: 0, skips: 0, lastAt: 0, dayParts: [0, 0, 0, 0], ...overrides };
}

function data(overrides: Partial<SyncedData>): SyncedData {
  return { favourites: [], recents: [], taste: { stations: {}, updatedAt: 0 }, ...overrides };
}

describe("mergeFirstSync", () => {
  it("keeps favourites from both sides without duplicates", () => {
    const merged = mergeFirstSync(data({ favourites: ["a", "b"] }), data({ favourites: ["b", "c"] }));
    expect(merged.favourites).toEqual(["b", "c", "a"]);
  });

  it("puts this device's recents first and caps the list", () => {
    const remote = Array.from({ length: 20 }, (_, i) => `r${i}`);
    const merged = mergeFirstSync(data({ recents: ["l1", "r3"] }), data({ recents: remote }));
    expect(merged.recents.slice(0, 3)).toEqual(["l1", "r3", "r0"]);
    expect(merged.recents).toHaveLength(20);
  });

  it("takes the larger tally per station, so merging twice changes nothing", () => {
    const local = data({ taste: { stations: { a: taste({ plays: 3, listenMs: 10, lastAt: 5, dayParts: [1, 0, 2, 0] }) }, updatedAt: 5 } });
    const remote = data({
      taste: {
        stations: { a: taste({ plays: 1, listenMs: 50, lastAt: 9, dayParts: [0, 4, 0, 0] }), b: taste({ plays: 2 }) },
        updatedAt: 9,
      },
    });
    const once = mergeFirstSync(local, remote);
    expect(once.taste.stations.a).toEqual(taste({ plays: 3, listenMs: 50, lastAt: 9, dayParts: [1, 4, 2, 0] }));
    expect(once.taste.stations.b.plays).toBe(2);
    expect(mergeFirstSync(once, remote)).toEqual(once);
  });
});

describe("parseRemote", () => {
  it("treats malformed cloud data as empty", () => {
    expect(parseRemote({ favourites: "x", recents: [1, "a"], taste: null })).toEqual(data({ recents: ["a"] }));
  });
});
