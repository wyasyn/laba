import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/motion";
import { useTheme } from "@/lib/useTheme";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { Tick02Icon, Timer02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const OPTIONS = [15, 30, 45, 60, 90];

function formatLeft(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** Re-renders every second while `active`, returning the current time. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/** Pill under the radio controls: sets the sleep timer and counts it down. */
export function SleepTimerButton() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const sleepUntil = usePlayerStore((s) => s.sleepUntil);
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer);
  const [open, setOpen] = useState(false);
  const now = useNow(sleepUntil !== null);
  const { t } = useT();

  const active = sleepUntil !== null;
  const label = active ? t("sleep.active", { time: formatLeft(sleepUntil - now) }) : t("sleep.button");

  const choose = (minutes: number | null) => {
    haptic.select();
    setSleepTimer(minutes);
    setOpen(false);
  };

  return (
    <>
      <PressableScale
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={active ? t("sleep.changeLabel", { label }) : t("sleep.setLabel")}
        className={
          active
            ? "flex-row items-center gap-2 rounded-full bg-primary px-4 py-2.5"
            : "flex-row items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5"
        }
      >
        <HugeiconsIcon icon={Timer02Icon} size={16} color={active ? colors.onPrimary : colors.textSecondary} />
        <Text
          className={active ? "text-[13px] font-semibold" : "text-[13px] font-semibold text-text-secondary"}
          style={active ? { color: colors.onPrimary, fontVariant: ["tabular-nums"] } : undefined}
        >
          {label}
        </Text>
      </PressableScale>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setOpen(false)}
          accessibilityLabel={t("sleep.close")}
        >
          <Pressable
            // Swallow taps on the sheet itself so they don't close it.
            onPress={() => {}}
            className="rounded-t-3xl bg-background px-5 pt-5"
            style={{ paddingBottom: insets.bottom + 16, borderCurve: "continuous" }}
          >
            <Text className="text-lg font-bold">{t("sleep.button")}</Text>
            <Text className="mt-1 text-sm text-text-secondary">{t("sleep.subtitle")}</Text>
            <View className="mt-4">
              {OPTIONS.map((minutes) => (
                <SheetRow key={minutes} label={t("sleep.minutes", { count: minutes })} onPress={() => choose(minutes)} />
              ))}
              <SheetRow label={t("sleep.off")} selected={!active} onPress={() => choose(null)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function SheetRow({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className="flex-row items-center justify-between border-b border-border py-4 active:opacity-60"
    >
      <Text className="text-base">{label}</Text>
      {selected ? <HugeiconsIcon icon={Tick02Icon} size={18} color={colors.primary} /> : null}
    </Pressable>
  );
}
