import {
  countryName,
  hasCategory,
  languageName,
  languagesOf,
  matchesFilters,
  matchesQuery,
  topCategories,
  topCountries,
  topLanguages,
} from "@/lib/search";
import { station } from "./fixtures";

describe("matchesQuery", () => {
  const s = station({ id: "a", name: "Capital FM", description: "Hits all day", categories: ["Music"] });

  it("matches name, description and categories, ignoring case and padding", () => {
    expect(matchesQuery(s, "capital")).toBe(true);
    expect(matchesQuery(s, "  HITS ")).toBe(true);
    expect(matchesQuery(s, "music")).toBe(true);
    expect(matchesQuery(s, "news")).toBe(false);
  });

  it("matches everything for an empty query", () => {
    expect(matchesQuery(s, "   ")).toBe(true);
  });
});

describe("topCategories", () => {
  it("ranks by frequency, normalises case and drops one-offs", () => {
    const stations = [
      station({ id: "1", categories: ["News", "Music"] }),
      station({ id: "2", categories: ["news"] }),
      station({ id: "3", categories: ["Music ", "Sport"] }),
      station({ id: "4", categories: ["news"] }),
    ];
    expect(topCategories(stations)).toEqual(["news", "music"]);
    expect(hasCategory(stations[2], "music")).toBe(true);
  });
});

describe("languages", () => {
  it("splits comma lists, lowercases and folds regional English", () => {
    expect(languagesOf(station({ id: "a", language: "English,French" }))).toEqual(["english", "french"]);
    expect(languagesOf(station({ id: "b", language: "english uk" }))).toEqual(["english"]);
    expect(languagesOf(station({ id: "c", language: "Luganda" }))).toEqual(["luganda"]);
  });

  it("ranks languages counting each station once", () => {
    const stations = [
      station({ id: "1", language: "English" }),
      station({ id: "2", language: "english,luganda" }),
      station({ id: "3", language: "Luganda" }),
      station({ id: "4", language: "english uk" }),
    ];
    expect(topLanguages(stations)).toEqual(["english", "luganda"]);
    expect(languageName("bahasa indonesia")).toBe("Bahasa Indonesia");
  });
});

describe("countries", () => {
  it("ranks by station count, then alphabetically", () => {
    const stations = [
      station({ id: "1", country: "US" }),
      station({ id: "2", country: "UG" }),
      station({ id: "3", country: "ug" }),
      station({ id: "4", country: "FR" }),
    ];
    expect(topCountries(stations)).toEqual(["UG", "FR", "US"]);
  });

  it("names known codes and passes unknown ones through", () => {
    expect(countryName("UG")).toBe("Uganda");
    expect(countryName("gb")).toBe("United Kingdom");
    expect(countryName("XX")).toBe("XX");
  });
});

describe("matchesFilters", () => {
  const s = station({ id: "a", country: "ug", language: "English,Luganda" });

  it("passes with no filters", () => {
    expect(matchesFilters(s, { country: null, language: null })).toBe(true);
  });

  it("requires every filter that is set", () => {
    expect(matchesFilters(s, { country: "UG", language: "luganda" })).toBe(true);
    expect(matchesFilters(s, { country: "US", language: null })).toBe(false);
    expect(matchesFilters(s, { country: "UG", language: "french" })).toBe(false);
  });
});
