import { CACHE_KEYS } from "@/lib/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { create } from "zustand";

export type Locale = "en" | "lg" | "sw";
export type LocalePreference = Locale | "system";

const LOCALES: Locale[] = ["en", "lg", "sw"];

function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** The first of the phone's languages that Laba speaks, else English. */
function systemLocale(): Locale {
  try {
    for (const l of getLocales()) {
      if (isLocale(l.languageCode)) return l.languageCode;
    }
  } catch {}
  return "en";
}

function resolve(preference: LocalePreference): Locale {
  return preference === "system" ? systemLocale() : preference;
}

interface LocaleStore {
  preference: LocalePreference;
  /** The language actually in use. */
  locale: Locale;
  hydrate: () => Promise<void>;
  setPreference: (preference: LocalePreference) => void;
}

export const useLocaleStore = create<LocaleStore>((set) => ({
  preference: "system",
  locale: systemLocale(),

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(CACHE_KEYS.LOCALE);
      const preference: LocalePreference = isLocale(stored) ? stored : "system";
      set({ preference, locale: resolve(preference) });
    } catch {}
  },

  setPreference: (preference) => {
    set({ preference, locale: resolve(preference) });
    AsyncStorage.setItem(CACHE_KEYS.LOCALE, preference).catch(() => {});
  },
}));
