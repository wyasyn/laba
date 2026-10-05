import {
  EMPTY_PROFILE,
  personalRows,
  recordListen,
  recordOpen,
  recordSkip,
  stationScores,
  type TasteProfile,
} from "@/lib/taste";
import { station } from "./fixtures";

const DAY = 24 * 60 * 60_000;
// A fixed local afternoon, so time-of-day buckets are stable.
const NOW = new Date(2026, 9, 5, 14, 0).getTime();

function listened(profile: TasteProfile, id: string, minutes: number, at = NOW): TasteProfile {
  return recordListen(recordOpen(profile, id, at), id, minutes * 60_000, at);
}

const catalogue = [
  station({ id: "gospel-1", categories: ["Religious"] }),
  station({ id: "gospel-2", categories: ["Religious"] }),
  station({ id: "gospel-3", categories: ["Religious"] }),
  station({ id: "news-1", categories: ["News"] }),
  station({ id: "sport-1", categories: ["Sports"], language: "Luganda" }),
  station({ id: "news-2", categories: ["News"] }),
];

describe("recordOpen", () => {
  it("counts a quick reopen as the same visit", () => {
    const once = recordOpen(EMPTY_PROFILE, "a", NOW);
    const twice = recordOpen(once, "a", NOW + 60_000);
    expect(twice.stations.a.plays).toBe(1);
    expect(recordOpen(once, "a", NOW + DAY).stations.a.plays).toBe(2);
  });
});

describe("stationScores", () => {
  it("is empty for a new user", () => {
    expect(stationScores(EMPTY_PROFILE, [], NOW).size).toBe(0);
  });

  it("fades with time", () => {
    const recent = stationScores(listened(EMPTY_PROFILE, "a", 30), [], NOW).get("a")!;
    const old = stationScores(listened(EMPTY_PROFILE, "a", 30, NOW - 28 * DAY), [], NOW).get("a")!;
    expect(old).toBeLessThan(recent / 3);
  });

  it("drops stations that are mostly skipped", () => {
    let p = recordOpen(EMPTY_PROFILE, "a", NOW);
    p = recordSkip(recordSkip(p, "a", NOW), "a", NOW);
    expect(stationScores(p, [], NOW).has("a")).toBe(false);
  });

  it("counts favourites even without listening", () => {
    expect(stationScores(EMPTY_PROFILE, ["a"], NOW).get("a")).toBeGreaterThan(0);
  });
});

describe("personalRows", () => {
  it("shows nothing until there is enough to go on", () => {
    expect(personalRows(catalogue, EMPTY_PROFILE, [], NOW, 10)).toEqual({
      jumpBackIn: [],
      topCategory: null,
      forYou: [],
    });
    const opened = recordOpen(EMPTY_PROFILE, "gospel-1", NOW);
    expect(personalRows(catalogue, opened, [], NOW, 10).jumpBackIn).toEqual([]);
    const skipped = recordSkip(listened(EMPTY_PROFILE, "gospel-1", 0.1), "gospel-1", NOW);
    expect(personalRows(catalogue, skipped, [], NOW, 10).jumpBackIn).toEqual([]);
  });

  it("puts the most listened first and recommends the same category", () => {
    let p = listened(EMPTY_PROFILE, "gospel-1", 60);
    p = listened(p, "news-1", 5);
    const rows = personalRows(catalogue, p, [], NOW, 10);

    expect(rows.jumpBackIn.map((s) => s.id)).toEqual(["gospel-1", "news-1"]);
    expect(rows.topCategory?.name).toBe("Religious");
    expect(rows.topCategory?.stations.map((s) => s.id)).toEqual(["gospel-2", "gospel-3"]);
  });

  it("keeps For you to other interests, with no repeats across rows", () => {
    let p = listened(EMPTY_PROFILE, "gospel-1", 60);
    p = listened(p, "news-1", 5);
    const rows = personalRows(catalogue, p, [], NOW, 10);
    const forYou = rows.forYou.map((s) => s.id);

    // News is liked, so another news station comes before the sports one.
    expect(forYou).toEqual(["news-2", "sport-1"]);
    const all = [...rows.jumpBackIn, ...(rows.topCategory?.stations ?? []), ...rows.forYou].map((s) => s.id);
    expect(new Set(all).size).toBe(all.length);
  });
});
