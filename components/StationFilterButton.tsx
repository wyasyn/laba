import { PressableScale } from "@/components/ui/PressableScale";
import { FILTER_CHIPS_HEIGHT } from "@/components/ui/FilterChips";
import { Text } from "@/components/ui/Text";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/motion";
import type { Station } from "@/lib/schemas";
import {
  countryName,
  languageName,
  topCountries,
  topLanguages,
  type StationFilters,
} from "@/lib/search";
import { useTheme } from "@/lib/useTheme";
import { FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const NO_FILTERS: StationFilters = { country: null, language: null };

interface StationFilterButtonProps {
  /** Stations the options are drawn from. */
  stations: Station[];
  value: StationFilters;
  onChange: (next: StationFilters) => void;
}

/**
 * Round button that sits at the end of a category rail and opens a sheet to
 * narrow the list by country and language. Filled while any filter is on.
 */
export function StationFilterButton({ stations, value, onChange }: StationFilterButtonProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const { t } = useT();

  const countries = useMemo(() => topCountries(stations), [stations]);
  const languages = useMemo(() => topLanguages(stations), [stations]);
  const activeCount = (value.country ? 1 : 0) + (value.language ? 1 : 0);
  const active = activeCount > 0;

  const set = (next: StationFilters) => {
    haptic.select();
    onChange(next);
  };

  const summary = [value.country && countryName(value.country), value.language && languageName(value.language)]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PressableScale
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={active ? t("filters.active", { summary }) : t("filters.open")}
        scaleTo={0.9}
        className={active ? "items-center justify-center rounded-full bg-primary" : "items-center justify-center rounded-full border border-border bg-surface"}
        style={{ width: FILTER_CHIPS_HEIGHT, height: FILTER_CHIPS_HEIGHT }}
      >
        <HugeiconsIcon icon={FilterHorizontalIcon} size={18} color={active ? colors.onPrimary : colors.textPrimary} />
        {active ? (
          <View
            className="absolute items-center justify-center rounded-full bg-background"
            style={{ top: -3, right: -3, width: 18, height: 18, borderWidth: 1.5, borderColor: colors.primary }}
          >
            <Text className="text-[10px] font-bold">{activeCount}</Text>
          </View>
        ) : null}
      </PressableScale>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)} accessibilityLabel={t("filters.close")}>
          <Pressable
            onPress={() => {}}
            className="max-h-[80%] rounded-t-3xl bg-background pt-5"
            style={{ paddingBottom: insets.bottom + 16, borderCurve: "continuous" }}
          >
            <View className="flex-row items-center justify-between px-5">
              <Text className="text-lg font-bold">{t("filters.title")}</Text>
              {active ? (
                <Pressable onPress={() => set(NO_FILTERS)} hitSlop={10} accessibilityRole="button">
                  <Text className="text-[15px] font-semibold text-text-secondary">{t("filters.reset")}</Text>
                </Pressable>
              ) : null}
            </View>

            <ScrollView className="mt-2" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              <Group
                title={t("filters.country")}
                anyLabel={t("filters.any")}
                options={countries}
                labelOf={countryName}
                selected={value.country}
                onSelect={(country) => set({ ...value, country })}
              />
              <Group
                title={t("filters.language")}
                anyLabel={t("filters.any")}
                options={languages}
                labelOf={languageName}
                selected={value.language}
                onSelect={(language) => set({ ...value, language })}
              />
            </ScrollView>

            <View className="px-5 pt-3">
              <PressableScale
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                className="items-center rounded-2xl bg-primary py-4"
              >
                <Text className="text-[16px] font-semibold" style={{ color: colors.onPrimary }}>
                  {t("common.done")}
                </Text>
              </PressableScale>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Group({
  title,
  anyLabel,
  options,
  labelOf,
  selected,
  onSelect,
}: {
  title: string;
  anyLabel: string;
  options: string[];
  labelOf: (value: string) => string;
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  if (options.length < 2) return null;
  const items: { value: string | null; label: string }[] = [
    { value: null, label: anyLabel },
    ...options.map((o) => ({ value: o, label: labelOf(o) })),
  ];
  return (
    <View className="mt-4">
      <Text className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-text-secondary">{title}</Text>
      <View className="flex-row flex-wrap gap-2">
        {items.map(({ value, label }) => {
          const on = selected === value;
          return (
            <Pressable
              key={value ?? ""}
              onPress={() => onSelect(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              className={
                on
                  ? "rounded-full border border-primary bg-primary px-4 py-2"
                  : "rounded-full border border-border bg-surface px-4 py-2 active:opacity-60"
              }
            >
              <Text className={on ? "text-[14px] font-semibold text-primary-foreground" : "text-[14px] font-medium"}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
