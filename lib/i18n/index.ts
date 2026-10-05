import { useLocaleStore, type Locale } from "@/stores/useLocaleStore";
import { useCallback } from "react";
import { en, type MessageKey } from "./en";
import { lg } from "./lg";
import { sw } from "./sw";

export type { MessageKey } from "./en";

const DICTIONARIES: Record<Locale, Partial<Record<MessageKey, string>>> = { en, lg, sw };

/** Shown in each language's own name, so people can find theirs. */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  lg: "Luganda",
  sw: "Kiswahili",
};

type Params = Record<string, string | number>;

/** Keys that come in `_one` / `_other` pairs, addressed without the suffix. */
type PluralBase<K> = K extends `${infer B}_one` ? B : never;
export type PluralKey = PluralBase<MessageKey>;

function lookup(locale: Locale, key: MessageKey) {
  return DICTIONARIES[locale][key] ?? en[key];
}

function fill(text: string, params?: Params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function translate(locale: Locale, key: MessageKey, params?: Params) {
  return fill(lookup(locale, key), params);
}

/** Picks `<key>_one` or `<key>_other` by `count` and fills `{count}`. */
export function translatePlural(locale: Locale, key: PluralKey, count: number, params?: Params) {
  const full = `${key}_${count === 1 ? "one" : "other"}` as MessageKey;
  return fill(lookup(locale, full), { count, ...params });
}

/** For code outside components (stores, helpers). Reads the current language. */
export function t(key: MessageKey, params?: Params) {
  return translate(useLocaleStore.getState().locale, key, params);
}

/** For components: re-renders when the language changes. */
export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  const tr = useCallback((key: MessageKey, params?: Params) => translate(locale, key, params), [locale]);
  const plural = useCallback(
    (key: PluralKey, count: number, params?: Params) => translatePlural(locale, key, count, params),
    [locale],
  );
  return { t: tr, plural, locale };
}
