import { mixInternational, rankFeatured } from "@/lib/homeSections";
import { station } from "./fixtures";

describe("rankFeatured", () => {
  it("alternates TV and radio, logos first within each type", () => {
    const featured = [
      station({ id: "tv-plain", type: "tv" }),
      station({ id: "tv-logo", type: "tv", logo: "https://x/logo.png" }),
      station({ id: "radio-1", type: "radio" }),
      station({ id: "radio-2", type: "radio", logo: "https://x/r.png" }),
    ];
    expect(rankFeatured(featured, 10).map((s) => s.id)).toEqual(["tv-logo", "radio-2", "tv-plain", "radio-1"]);
  });

  it("stops at the limit", () => {
    const featured = Array.from({ length: 6 }, (_, i) => station({ id: `s${i}`, type: i % 2 ? "tv" : "radio" }));
    expect(rankFeatured(featured, 3)).toHaveLength(3);
  });
});

describe("mixInternational", () => {
  it("cycles countries so one country cannot fill the row", () => {
    const stations = [
      station({ id: "us-1", type: "tv", country: "US" }),
      station({ id: "us-2", type: "tv", country: "US" }),
      station({ id: "us-3", type: "tv", country: "US" }),
      station({ id: "fr-1", type: "tv", country: "FR" }),
      station({ id: "gb-1", type: "radio", country: "GB" }),
    ];
    expect(mixInternational(stations, 4).map((s) => s.id)).toEqual(["us-1", "gb-1", "fr-1", "us-2"]);
  });
});
