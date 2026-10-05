import { CACHE_KEYS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { mergeFirstSync, parseRemote, type SyncedData } from "@/lib/syncMerge";
import { useAuthStore } from "@/stores/useAuthStore";
import { useFavouritesStore } from "@/stores/useFavouritesStore";
import { useNetworkStore } from "@/stores/useNetworkStore";
import { useRecentsStore } from "@/stores/useRecentsStore";
import { useTasteStore } from "@/stores/useTasteStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";

/** Coalesce a burst of local changes into one upload. */
const PUSH_DELAY_MS = 10_000;

/** Survives restarts so offline changes are not overwritten by an older cloud copy. */
interface SyncMeta {
  /** Account this device last synced with; a different one means a first sync. */
  userId: string;
  /** Server time of the cloud copy this device last saw or wrote. */
  remoteUpdatedAt: string | null;
  /** Local changes not yet uploaded. */
  dirty: boolean;
}

function readLocal(): SyncedData {
  return {
    favourites: useFavouritesStore.getState().ids,
    recents: useRecentsStore.getState().ids,
    taste: useTasteStore.getState().profile,
  };
}

async function loadMeta(): Promise<SyncMeta | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.SYNC_META);
    return raw ? (JSON.parse(raw) as SyncMeta) : null;
  } catch {
    return null;
  }
}

function saveMeta(meta: SyncMeta | null) {
  const write = meta
    ? AsyncStorage.setItem(CACHE_KEYS.SYNC_META, JSON.stringify(meta))
    : AsyncStorage.removeItem(CACHE_KEYS.SYNC_META);
  write.catch(() => {});
}

/** Resolves once the local stores have read their saved data. */
function whenHydrated() {
  const ready = () =>
    useFavouritesStore.getState().isLoaded && useRecentsStore.getState().isLoaded && useTasteStore.getState().isLoaded;
  if (ready()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const unsubs = [useFavouritesStore, useRecentsStore, useTasteStore].map((store) =>
      (store.subscribe as (fn: () => void) => () => void)(() => {
        if (!ready()) return;
        unsubs.forEach((u) => u());
        resolve();
      }),
    );
  });
}

/**
 * Keeps favourites, recents and the taste profile in step with the signed-in
 * account. The first sign-in on a device merges both sides; after that the
 * latest change wins: local edits are uploaded (before any download), and a
 * newer cloud copy replaces the local one when the app starts or returns to
 * the foreground. Signing out keeps the data on the device.
 * Call once at startup; returns the unsubscribe.
 */
export function watchCloudSync() {
  const client = supabase;
  if (!client) return () => {};

  let meta: SyncMeta | null = null;
  let userId: string | null = null;
  let applying = false;
  let busy: Promise<void> = Promise.resolve();
  let pushTimer: ReturnType<typeof setTimeout> | null = null;

  /** Runs sync steps one at a time so a push and a pull never interleave. */
  const queue = (step: () => Promise<void>) => {
    busy = busy.then(step).catch(() => {});
    return busy;
  };

  const apply = (data: SyncedData) => {
    applying = true;
    useFavouritesStore.getState().replace(data.favourites);
    useRecentsStore.getState().replace(data.recents);
    useTasteStore.getState().replace(data.taste);
    applying = false;
  };

  const synced = (id: string, remoteUpdatedAt: string | null, dirty: boolean) => {
    meta = { userId: id, remoteUpdatedAt, dirty };
    saveMeta(meta);
    if (!dirty) useAuthStore.getState().setLastSyncedAt(Date.now());
  };

  const push = async () => {
    const id = userId;
    if (!id || !meta?.dirty || !useNetworkStore.getState().isOnline) return;
    const { favourites, recents, taste } = readLocal();
    const { data, error } = await client
      .from("profiles")
      .upsert({ user_id: id, favourites, recents, taste })
      .select("updated_at")
      .single();
    if (error || id !== userId) return; // Stays dirty; retried later.
    synced(id, data.updated_at, false);
  };

  const pull = async (first: boolean) => {
    const id = userId;
    if (!id) return;
    const { data, error } = await client
      .from("profiles")
      .select("favourites, recents, taste, updated_at")
      .eq("user_id", id)
      .maybeSingle();
    if (error || id !== userId) return;

    if (first) {
      apply(data ? mergeFirstSync(readLocal(), parseRemote(data)) : readLocal());
      synced(id, data?.updated_at ?? null, true);
      await push();
      return;
    }
    const newer = data && (!meta?.remoteUpdatedAt || Date.parse(data.updated_at) > Date.parse(meta.remoteUpdatedAt));
    if (newer) {
      apply(parseRemote(data));
      synced(id, data.updated_at, false);
    } else {
      useAuthStore.getState().setLastSyncedAt(Date.now());
    }
  };

  /** Uploads pending changes first, so they are never replaced by an older cloud copy. */
  const refresh = () =>
    queue(async () => {
      if (!userId) return;
      if (meta?.dirty) await push();
      if (!meta?.dirty) await pull(false);
    });

  const start = (id: string) =>
    queue(async () => {
      await whenHydrated();
      userId = id;
      meta = await loadMeta();
      if (meta?.userId === id) {
        if (meta.dirty) await push();
        if (!meta.dirty) await pull(false);
      } else {
        await pull(true);
      }
    });

  const stop = () => {
    userId = null;
    meta = null;
    saveMeta(null);
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = null;
  };

  const onLocalChange = () => {
    if (applying || !userId || !meta) return;
    if (!meta.dirty) {
      meta = { ...meta, dirty: true };
      saveMeta(meta);
    }
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      pushTimer = null;
      void queue(push);
    }, PUSH_DELAY_MS);
  };

  const unsubscribers = [
    useAuthStore.subscribe((s, prev) => {
      const next = s.user?.id ?? null;
      if (next === (prev.user?.id ?? null)) return;
      if (next) void start(next);
      else if (prev.status === "signedIn") stop();
    }),
    useFavouritesStore.subscribe((s, prev) => s.ids !== prev.ids && onLocalChange()),
    useRecentsStore.subscribe((s, prev) => s.ids !== prev.ids && onLocalChange()),
    useTasteStore.subscribe((s, prev) => s.profile !== prev.profile && onLocalChange()),
    useNetworkStore.subscribe((s, prev) => s.isOnline && !prev.isOnline && void refresh()),
  ];
  const appState = AppState.addEventListener("change", (state) => {
    if (state === "active") void refresh();
    else if (meta?.dirty) void queue(push);
  });

  const current = useAuthStore.getState().user;
  if (current) void start(current.id);

  return () => {
    unsubscribers.forEach((u) => u());
    appState.remove();
    if (pushTimer) clearTimeout(pushTimer);
  };
}
