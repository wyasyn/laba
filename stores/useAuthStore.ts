import { supabase } from "@/lib/supabase";
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from "@react-native-google-signin/google-signin";
import type { AuthError } from "@supabase/supabase-js";
import { create } from "zustand";

/** Why a sign-in step failed, for the Account screen to explain. */
export type AuthFailure = "cancelled" | "network" | "invalidCode" | "rateLimited" | "playServices" | "generic";

export interface AccountUser {
  id: string;
  email: string | null;
}

interface AuthStore {
  /** "loading" until the stored session has been read. */
  status: "loading" | "signedOut" | "signedIn";
  user: AccountUser | null;
  /** Last successful sync with the cloud, ms since epoch (this session only). */
  lastSyncedAt: number | null;

  // Actions. Each resolves to null on success or the reason it failed.
  signInWithGoogle: () => Promise<AuthFailure | null>;
  sendEmailCode: (email: string) => Promise<AuthFailure | null>;
  verifyEmailCode: (email: string, code: string) => Promise<AuthFailure | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<AuthFailure | null>;
  /** Sync only. */
  setLastSyncedAt: (time: number) => void;
}

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
let googleConfigured = false;

function configureGoogle() {
  if (googleConfigured) return;
  // The ID token is issued for the web client, which Supabase checks it against.
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  googleConfigured = true;
}

function fromSupabase(error: AuthError): AuthFailure {
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
    return "rateLimited";
  }
  if (error.code === "otp_expired" || error.code === "invalid_credentials") return "invalidCode";
  if (error.name === "AuthRetryableFetchError") return "network";
  return "generic";
}

export const useAuthStore = create<AuthStore>((set) => ({
  status: "loading",
  user: null,
  lastSyncedAt: null,

  signInWithGoogle: async () => {
    if (!supabase || !WEB_CLIENT_ID) return "generic";
    configureGoogle();
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return "cancelled";
      const token = response.data.idToken;
      if (!token) return "generic";
      const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token });
      return error ? fromSupabase(error) : null;
    } catch (e) {
      if (isErrorWithCode(e)) {
        if (e.code === statusCodes.IN_PROGRESS) return "cancelled";
        if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return "playServices";
      }
      return "generic";
    }
  },

  sendEmailCode: async (email) => {
    if (!supabase) return "generic";
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    return error ? fromSupabase(error) : null;
  },

  verifyEmailCode: async (email, code) => {
    if (!supabase) return "generic";
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    return error ? fromSupabase(error) : null;
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut({ scope: "local" });
    // So the next Google sign-in offers the account picker again.
    if (googleConfigured) await GoogleSignin.signOut().catch(() => {});
  },

  deleteAccount: async () => {
    if (!supabase) return "generic";
    const { error } = await supabase.rpc("delete_account");
    if (error) return "generic";
    await supabase.auth.signOut({ scope: "local" });
    if (googleConfigured) await GoogleSignin.revokeAccess().catch(() => {});
    return null;
  },

  setLastSyncedAt: (time) => set({ lastSyncedAt: time }),
}));

/** Follows the Supabase session. Call once at startup; returns the unsubscribe. */
export function watchAuth() {
  const client = supabase;
  if (!client) {
    useAuthStore.setState({ status: "signedOut" });
    return () => {};
  }
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;
    const current = useAuthStore.getState().user;
    if (user && current?.id === user.id && current.email === (user.email ?? null)) return;
    useAuthStore.setState(
      user
        ? { status: "signedIn", user: { id: user.id, email: user.email ?? null } }
        : { status: "signedOut", user: null, lastSyncedAt: null },
    );
  });
  return () => data.subscription.unsubscribe();
}
