import { CACHE_KEYS } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { accountsEnabled } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Alert } from "react-native";
import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";

/**
 * Laba asks a signed-out person to back up at most once: either when they
 * save their first favourite, or with a Home card once they have listening
 * history. Answering either one retires both.
 */
interface BackupInviteStore {
  /** True until the saved answer is read, so nothing flashes or asks twice. */
  answered: boolean;
  hydrate: () => Promise<void>;
  answer: () => void;
}

export const useBackupInviteStore = create<BackupInviteStore>((set) => ({
  answered: true,

  hydrate: async () => {
    try {
      const v = await AsyncStorage.getItem(CACHE_KEYS.BACKUP_INVITE_DISMISSED);
      set({ answered: v === "true" });
    } catch {}
  },

  answer: () => {
    set({ answered: true });
    AsyncStorage.setItem(CACHE_KEYS.BACKUP_INVITE_DISMISSED, "true").catch(() => {});
  },
}));

/** Whether the invite may be shown right now. */
export function canInviteBackup() {
  return (
    accountsEnabled && useAuthStore.getState().status === "signedOut" && !useBackupInviteStore.getState().answered
  );
}

/** Called after a favourite is added: the natural moment to offer a backup. */
export function offerBackupAfterFavourite() {
  if (!canInviteBackup()) return;
  useBackupInviteStore.getState().answer();
  Alert.alert(t("favourites.backupTitle"), t("favourites.backupMessage"), [
    { text: t("home.backupDismiss"), style: "cancel" },
    { text: t("home.backupAction"), onPress: () => router.push("/account") },
  ]);
}
