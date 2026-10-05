import { translate, translatePlural } from "@/lib/i18n";
import { en, type MessageKey } from "@/lib/i18n/en";
import { lg } from "@/lib/i18n/lg";
import { sw } from "@/lib/i18n/sw";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("translate", () => {
  it("fills placeholders and leaves unknown ones alone", () => {
    expect(translate("en", "station.share", { name: "CBS FM" })).toBe("Share CBS FM");
    expect(translate("en", "station.share")).toBe("Share {name}");
  });

  it("uses the chosen language", () => {
    expect(translate("sw", "tabs.home")).toBe("Nyumbani");
    expect(translate("lg", "tabs.home")).toBe("Awaka");
  });

  it("picks the plural form by count", () => {
    expect(translatePlural("en", "favourites.count", 1)).toBe("1 saved station");
    expect(translatePlural("en", "favourites.count", 3)).toBe("3 saved stations");
    expect(translatePlural("sw", "favourites.count", 3)).toBe("Vituo 3 vimehifadhiwa");
  });
});

describe.each([
  ["sw", sw],
  ["lg", lg],
])("%s strings", (_locale, dictionary) => {
  it("use the same placeholders as English", () => {
    for (const [key, text] of Object.entries(dictionary)) {
      expect({ key, placeholders: placeholders(text!) }).toEqual({
        key,
        placeholders: placeholders(en[key as MessageKey]),
      });
    }
  });

  it("cover every English string", () => {
    const missing = (Object.keys(en) as MessageKey[]).filter((key) => !(key in dictionary));
    expect(missing).toEqual([]);
  });
});
