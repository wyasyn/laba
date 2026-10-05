import { Text } from "@/components/ui/Text";
import { LANGUAGE_NAMES, useT } from "@/lib/i18n";
import { haptic } from "@/lib/motion";
import { useTheme } from "@/lib/useTheme";
import { useLocaleStore, type LocalePreference } from "@/stores/useLocaleStore";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CHOICES: LocalePreference[] = ["system", "en", "lg", "sw"];

/** Bottom sheet for picking the app language. */
export function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const preference = useLocaleStore((s) => s.preference);
  const setPreference = useLocaleStore((s) => s.setPreference);

  const choose = (next: LocalePreference) => {
    haptic.select();
    setPreference(next);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose} accessibilityLabel={t("common.cancel")}>
        <Pressable
          onPress={() => {}}
          className="rounded-t-3xl bg-background px-5 pt-5"
          style={{ paddingBottom: insets.bottom + 16, borderCurve: "continuous" }}
        >
          <Text className="text-lg font-bold">{t("settings.language")}</Text>
          <View className="mt-3">
            {CHOICES.map((choice) => {
              const selected = preference === choice;
              return (
                <Pressable
                  key={choice}
                  onPress={() => choose(choice)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className="flex-row items-center justify-between border-b border-border py-4 active:opacity-60"
                >
                  <Text className="text-base">
                    {choice === "system" ? t("settings.languageSystem") : LANGUAGE_NAMES[choice]}
                  </Text>
                  {selected ? <HugeiconsIcon icon={Tick02Icon} size={18} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
