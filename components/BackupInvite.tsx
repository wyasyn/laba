import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { useT } from "@/lib/i18n";
import { duration } from "@/lib/motion";
import { accountsEnabled } from "@/lib/supabase";
import { useTheme } from "@/lib/useTheme";
import { useAuthStore } from "@/stores/useAuthStore";
import { useBackupInviteStore } from "@/stores/useBackupInviteStore";
import { CloudUploadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

/**
 * A Home card asking someone with listening history to sign in and back it
 * up. Shares its one-time answer with the favourite prompt.
 */
export function BackupInvite({ hasHistory }: { hasHistory: boolean }) {
  const { t } = useT();
  const { colors } = useTheme();
  const router = useRouter();
  const signedOut = useAuthStore((s) => s.status === "signedOut");
  const answered = useBackupInviteStore((s) => s.answered);
  const answer = useBackupInviteStore((s) => s.answer);

  if (!accountsEnabled || !signedOut || !hasHistory || answered) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(duration.base)}
      exiting={FadeOut.duration(duration.fast)}
      className="mx-5 mb-8 gap-3 rounded-2xl border border-border bg-surface p-4"
      style={{ borderCurve: "continuous" }}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/15">
          <HugeiconsIcon icon={CloudUploadIcon} size={20} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-semibold">{t("home.backupTitle")}</Text>
          <Text className="text-[13px] text-text-secondary">{t("home.backupBody")}</Text>
        </View>
      </View>
      <View className="flex-row justify-end gap-2">
        <PressableScale onPress={answer} accessibilityRole="button" className="rounded-full px-4 py-2">
          <Text className="text-[14px] font-semibold text-text-secondary">{t("home.backupDismiss")}</Text>
        </PressableScale>
        <PressableScale
          onPress={() => {
            answer();
            router.push("/account");
          }}
          accessibilityRole="button"
          className="rounded-full bg-primary px-4 py-2"
        >
          <Text className="text-[14px] font-semibold text-primary-foreground">{t("home.backupAction")}</Text>
        </PressableScale>
      </View>
    </Animated.View>
  );
}
