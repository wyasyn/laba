import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

/**
 * Supabase client for optional sign-in and sync. Null unless the build sets
 * EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, so forked and
 * keyless builds run without accounts (the Account row is hidden).
 */
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  URL && ANON_KEY
    ? createClient(URL, ANON_KEY, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export const accountsEnabled = supabase !== null;

/** Refreshes the session token only while the app is in the foreground. */
export function watchSessionRefresh() {
  const client = supabase;
  if (!client) return () => {};
  if (AppState.currentState === "active") void client.auth.startAutoRefresh();
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") void client.auth.startAutoRefresh();
    else void client.auth.stopAutoRefresh();
  });
  return () => sub.remove();
}
