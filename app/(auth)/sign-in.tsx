import { useSSO, useSignIn, useSignUp } from "@clerk/expo";
import { useSignInWithGoogle } from "@clerk/expo/google";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { useTheme } from "@/lib/useTheme";

const APP_NAME = Constants.expoConfig?.name ?? "Laba";

/** Legal docs on laba.yasinwalum.com (see docs/GITHUB-PAGES-AND-CLERK.md). */
const LEGAL_TERMS_URL = "https://laba.yasinwalum.com/terms";
const LEGAL_PRIVACY_URL = "https://laba.yasinwalum.com/privacy";

const LOGO_SOURCE = require("@/assets/images/icon.png");
const LOGO_SIZE = 96;

/** Official multicolor Google G mark (brand colors). */
function GoogleColoredIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Google">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Svg>
  );
}

function fieldError(errors: unknown, key: string): string | undefined {
  if (!errors || typeof errors !== "object" || !("fields" in errors)) {
    return undefined;
  }
  const fields = (errors as { fields?: Record<string, unknown> }).fields;
  if (!fields) return undefined;
  const v = fields[key];
  if (!v) return undefined;
  if (Array.isArray(v)) {
    const first = v[0] as { message?: string } | undefined;
    return first?.message;
  }
  if (typeof v === "object" && v !== null && "message" in v) {
    return String((v as { message?: string }).message);
  }
  return undefined;
}

function globalErrorMessage(errors: unknown): string | undefined {
  if (!errors || typeof errors !== "object" || !("global" in errors)) {
    return undefined;
  }
  const g = (errors as { global?: unknown }).global;
  if (g === undefined || g === null) return undefined;
  if (Array.isArray(g)) {
    const first = g[0] as { message?: string } | undefined;
    return first?.message;
  }
  if (typeof g === "object" && g !== null && "message" in g) {
    return String((g as { message?: string }).message);
  }
  return undefined;
}

function isSignUpIfMissingTransfer(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("errors" in error)) return false;
  const errs = (error as { errors?: Array<{ code?: string }> }).errors;
  return errs?.[0]?.code === "sign_up_if_missing_transfer";
}

function googleSignInErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m.length > 0) return m;
  }
  if (typeof err === "object" && err !== null && "errors" in err) {
    const errs = (err as { errors?: Array<{ message?: string }> }).errors;
    const first = errs?.[0]?.message;
    if (first) return first;
  }
  return "Something went wrong during Google sign-in.";
}

export default function SignInScreen() {
  const { colors } = useTheme();
  const { signIn, errors: signInErrors, fetchStatus: signInFetch } = useSignIn();
  const { signUp, errors: signUpErrors, fetchStatus: signUpFetch } =
    useSignUp();
  const { startSSOFlow } = useSSO();
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [showMissingRequirements, setShowMissingRequirements] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const fetching = signInFetch === "fetching" || signUpFetch === "fetching";

  const signInWithGoogle = useCallback(async () => {
    setGoogleError(null);
    setGoogleBusy(true);
    try {
      if (Platform.OS === "web") {
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy: "oauth_google",
        });
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
        }
      } else {
        const { createdSessionId, setActive, signUp: flowSignUp } =
          await startGoogleAuthenticationFlow();
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
        } else if (flowSignUp?.status === "missing_requirements") {
          setShowMissingRequirements(true);
        }
      }
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code?: unknown }).code)
          : undefined;
      if (code === "SIGN_IN_CANCELLED" || code === "-5") {
        return;
      }
      const message = googleSignInErrorMessage(err);
      setGoogleError(message);
      Alert.alert("Error", message);
      console.error("Google sign-in error:", err);
    } finally {
      setGoogleBusy(false);
    }
  }, [startGoogleAuthenticationFlow, startSSOFlow]);

  const resetFlow = useCallback(() => {
    signIn.reset();
    setEmail("");
    setCode("");
    setVerifying(false);
    setShowMissingRequirements(false);
    setLegalAccepted(false);
  }, [signIn]);

  const sendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;

    const { error: createError } = await signIn.create({
      identifier: trimmed,
      signUpIfMissing: true,
    });
    if (createError) return;

    const { error: sendError } = await signIn.emailCode.sendCode();
    if (!sendError) setVerifying(true);
  };

  const finalizeSignIn = async () => {
    if (signIn.status === "complete") {
      await signIn.finalize();
    }
  };

  const finalizeSignUp = async () => {
    if (signUp.status === "complete") {
      await signUp.finalize();
    }
  };

  const handleTransfer = async () => {
    const { error } = await signUp.create({ transfer: true });
    if (error) return;

    if (signUp.status === "complete") {
      await finalizeSignUp();
    } else if (signUp.status === "missing_requirements") {
      setShowMissingRequirements(true);
    }
  };

  const verifyCode = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    const { error } = await signIn.emailCode.verifyCode({ code: trimmed });

    if (error) {
      if (isSignUpIfMissingTransfer(error)) {
        await handleTransfer();
      }
      return;
    }

    if (signIn.status === "complete") {
      await finalizeSignIn();
    } else if (signIn.status === "needs_second_factor") {
      // Unlikely for email-only; surface a clear message
      console.warn("Sign-in needs second factor:", signIn.status);
    } else if (signIn.status === "needs_client_trust") {
      console.warn("Sign-in needs client trust:", signIn.status);
    }
  };

  const submitMissingRequirements = async () => {
    const needsLegal = signUp.missingFields?.includes("legal_accepted");
    const otherMissing =
      signUp.missingFields?.filter((f) => f !== "legal_accepted") ?? [];
    if (otherMissing.length > 0) return;
    if (!needsLegal) return;

    const { error } = await signUp.update({ legalAccepted });
    if (error) return;

    if (signUp.status === "complete") {
      await finalizeSignUp();
    }
  };

  const identifierErr =
    fieldError(signInErrors, "identifier") ??
    fieldError(signInErrors, "emailAddress");
  const codeErr = fieldError(signInErrors, "code");
  const signInGlobal = globalErrorMessage(signInErrors);
  const signUpGlobal = globalErrorMessage(signUpErrors);

  const inputClass =
    "rounded-xl border border-border bg-surface px-4 py-3.5 text-[16px] text-foreground";

  if (showMissingRequirements) {
    const needsLegal = signUp.missingFields?.includes("legal_accepted");
    const otherMissing =
      signUp.missingFields?.filter((f) => f !== "legal_accepted") ?? [];
    const canSubmitMissingRequirements =
      otherMissing.length === 0 && (!needsLegal || legalAccepted);

    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 20,
              paddingBottom: 40,
              paddingTop: 24,
            }}
          >
            <Text className="text-[26px] font-bold text-foreground">
              Almost there
            </Text>
            <Text className="mt-2 text-[15px] leading-[22px] text-text-secondary">
              Complete the following to create your account.
            </Text>

            {otherMissing.length > 0 && (
              <Text className="mt-4 text-sm text-warning">
                Additional fields required by your Clerk instance:{" "}
                {otherMissing.join(", ")}. Configure the dashboard or collect
                these in-app.
              </Text>
            )}

            {needsLegal && (
              <View className="mt-6 rounded-xl border border-border bg-surface p-4">
                <View className="flex-row items-start gap-3">
                  <Pressable
                    onPress={() => setLegalAccepted(!legalAccepted)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: legalAccepted }}
                    hitSlop={8}
                  >
                    <View
                      className={`mt-0.5 h-5 w-5 rounded border ${
                        legalAccepted
                          ? "border-primary bg-primary"
                          : "border-border"
                      }`}
                    />
                  </Pressable>
                  <View className="flex-1">
                    <Text className="text-[15px] leading-[22px] text-foreground">
                      I agree to the{" "}
                      <Text
                        className="font-semibold text-primary underline"
                        onPress={() =>
                          void Linking.openURL(LEGAL_TERMS_URL).catch(() => {})
                        }
                      >
                        Terms of Service
                      </Text>{" "}
                      and the{" "}
                      <Text
                        className="font-semibold text-primary underline"
                        onPress={() =>
                          void Linking.openURL(LEGAL_PRIVACY_URL).catch(
                            () => {}
                          )
                        }
                      >
                        Privacy Policy
                      </Text>
                      .
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {(fieldError(signUpErrors, "legalAccepted") ||
              signUpGlobal) && (
              <Text className="mt-3 text-sm text-error">
                {fieldError(signUpErrors, "legalAccepted") ?? signUpGlobal}
              </Text>
            )}

            <Pressable
              onPress={() => void submitMissingRequirements()}
              disabled={fetching || !canSubmitMissingRequirements}
              className={`mt-6 flex-row items-center justify-center rounded-xl py-4 ${
                fetching || !canSubmitMissingRequirements
                  ? "bg-primary/50"
                  : "bg-primary"
              }`}
            >
              {fetching ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-[16px] font-semibold text-white">
                  Create account
                </Text>
              )}
            </Pressable>

            <Pressable onPress={resetFlow} className="mt-4 py-2">
              <Text className="text-center text-[15px] font-medium text-primary">
                Start over
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (verifying) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 20,
              paddingBottom: 40,
              paddingTop: 24,
            }}
          >
            <Text className="text-[26px] font-bold text-foreground">
              Check your email
            </Text>
            <Text className="mt-2 text-[15px] leading-[22px] text-text-secondary">
              We sent a verification code to{" "}
              <Text className="font-semibold text-foreground">{email.trim()}</Text>
            </Text>

            <Text className="mb-1.5 mt-8 text-sm font-medium text-foreground">
              Verification code
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="6-digit code"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={8}
              autoCapitalize="none"
              autoCorrect={false}
              className={inputClass}
            />
            {codeErr ? (
              <Text className="mt-2 text-sm text-error">{codeErr}</Text>
            ) : null}
            {signInGlobal ? (
              <Text className="mt-2 text-sm text-error">{signInGlobal}</Text>
            ) : null}

            <Pressable
              onPress={() => void verifyCode()}
              disabled={fetching || code.trim().length < 4}
              className={`mt-6 flex-row items-center justify-center rounded-xl py-4 ${
                fetching || code.trim().length < 4
                  ? "bg-primary/50"
                  : "bg-primary"
              }`}
            >
              {fetching ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-[16px] font-semibold text-white">
                  Verify & continue
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => void signIn.emailCode.sendCode()}
              disabled={fetching}
              className="mt-4 py-2"
            >
              <Text className="text-center text-[15px] font-medium text-primary">
                Resend code
              </Text>
            </Pressable>

            <Pressable onPress={resetFlow} className="mt-1 py-2">
              <Text className="text-center text-[15px] text-text-secondary">
                Use a different email
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingBottom: 40,
            paddingTop: 32,
          }}
        >
          <View className="items-center">
            <Image
              source={LOGO_SOURCE}
              style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
              contentFit="contain"
              accessibilityRole="image"
              accessibilityLabel={`${APP_NAME} logo`}
            />
          </View>
          <Text className="mt-5 text-center text-[28px] font-bold text-foreground">
            {APP_NAME}
          </Text>
          <Text className="mt-2 text-center text-[15px] leading-[22px] text-text-secondary">
            Sign in or create an account with your email.
          </Text>

          <Text className="mb-1.5 mt-10 text-sm font-medium text-foreground">
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email address"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            className={inputClass}
          />
          {identifierErr ? (
            <Text className="mt-2 text-sm text-error">{identifierErr}</Text>
          ) : null}
          {signInGlobal ? (
            <Text className="mt-2 text-sm text-error">{signInGlobal}</Text>
          ) : null}

          <View nativeID="clerk-captcha" className="h-1" />

          <Pressable
            onPress={() => void sendCode()}
            disabled={fetching || !email.trim() || googleBusy}
            className={`mt-6 flex-row items-center justify-center rounded-xl py-4 ${
              fetching || !email.trim() || googleBusy
                ? "bg-primary/50"
                : "bg-primary"
            }`}
          >
            {fetching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-[16px] font-semibold text-white">Continue</Text>
            )}
          </Pressable>

          <View className="my-8 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />
            <Text className="text-sm text-text-secondary">or</Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          <Pressable
            onPress={() => void signInWithGoogle()}
            disabled={googleBusy || fetching}
            className={`flex-row items-center justify-center gap-3 rounded-xl border border-border bg-surface py-4 ${
              googleBusy || fetching ? "opacity-50" : ""
            }`}
          >
            {googleBusy ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <>
                <GoogleColoredIcon size={22} />
                <Text className="text-[16px] font-semibold text-foreground">
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>
          {googleError ? (
            <Text className="mt-2 text-sm text-error">{googleError}</Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
