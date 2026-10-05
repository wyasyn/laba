import type { AudioStatus } from "expo-audio";
import { streamTitleOf } from "@/lib/streamTitle";

const withTitle = (streamTitle: string | null) => ({ streamTitle }) as unknown as AudioStatus;

describe("streamTitleOf", () => {
  it("passes plain titles through", () => {
    expect(streamTitleOf(withTitle("Luke Bryan - All My Friends Say"))).toBe("Luke Bryan - All My Friends Say");
  });

  it("keeps the first two pipe fields and drops URLs", () => {
    expect(
      streamTitleOf(withTitle("JVKE | CHRISTmas | this is what christmas feels like | https://x/y.jpg")),
    ).toBe("JVKE · CHRISTmas");
    expect(streamTitleOf(withTitle("CBN News|https://cbn.com/a.jpg"))).toBe("CBN News");
  });

  it("treats empty and placeholder values as nothing", () => {
    expect(streamTitleOf(withTitle(""))).toBeNull();
    expect(streamTitleOf(withTitle(null))).toBeNull();
    expect(streamTitleOf(withTitle(" - "))).toBeNull();
    expect(streamTitleOf(withTitle("Unknown"))).toBeNull();
    expect(streamTitleOf(withTitle("https://station.example"))).toBeNull();
  });
});
