import { IconButton } from "@/components/ui/IconButton";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { t as translateNow, useT, type MessageKey } from "@/lib/i18n";
import { haptic } from "@/lib/motion";
import { useTheme } from "@/lib/useTheme";
import { useAuthStore, type AuthFailure } from "@/stores/useAuthStore";
import {
  ArrowLeft01Icon,
  CloudSavingDone01Icon,
  CloudUploadIcon,
  Delete02Icon,
  Logout01Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { useState, type ComponentProps, type ReactNode } from "react";
import Svg, { Path } from "react-native-svg";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconSvg = ComponentProps<typeof HugeiconsIcon>["icon"];

const FAILURE_MESSAGES: Record<Exclude<AuthFailure, "cancelled">, MessageKey> = {
  network: "account.errorNetwork",
  invalidCode: "account.errorInvalidCode",
  rateLimited: "account.errorRateLimited",
  playServices: "account.errorPlayServices",
  generic: "account.errorGeneric",
};

function failureMessage(failure: AuthFailure | null): MessageKey | null {
  return failure && failure !== "cancelled" ? FAILURE_MESSAGES[failure] : null;
}

/** Back button row under the status bar. */
const HEADER_HEIGHT = 56;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const status = useAuthStore((s) => s.status);

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ paddingTop: insets.top + 4 }} className="flex-row items-center gap-3 px-4 pb-2">
        <IconButton icon={ArrowLeft01Icon} onPress={() => router.back()} accessibilityLabel={t("common.goBack")} />
        <Text className="flex-1 text-[17px] font-semibold">{t("account.title")}</Text>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        // Centred on the screen, not just below the header: the bottom padding
        // matches the header's height.
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + HEADER_HEIGHT,
        }}
      >
        <View style={{ width: "100%", maxWidth: 480, alignSelf: "center" }}>
          {status === "loading" ? (
            <ActivityIndicator />
          ) : status === "signedIn" ? (
            <SignedIn />
          ) : (
            <SignedOut />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SignedOut() {
  const { t } = useT();
  const { colors } = useTheme();
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const sendEmailCode = useAuthStore((s) => s.sendEmailCode);
  const verifyEmailCode = useAuthStore((s) => s.verifyEmailCode);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState<"google" | "email" | "code" | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);

  const run = async (kind: "google" | "email" | "code", action: () => Promise<AuthFailure | null>) => {
    setBusy(kind);
    setError(null);
    const failure = await action();
    setBusy(null);
    setError(failureMessage(failure));
    if (!failure) haptic.success();
    return failure;
  };

  const trimmedEmail = email.trim().toLowerCase();
  const emailValid = EMAIL_PATTERN.test(trimmedEmail);

  const sendCode = async () => {
    const failure = await run("email", () => sendEmailCode(trimmedEmail));
    if (!failure) {
      setCodeSentTo(trimmedEmail);
      setCode("");
    }
  };

  return (
    <View className="gap-6">
      <View className="items-center gap-3">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <HugeiconsIcon icon={CloudUploadIcon} size={30} color={colors.primary} />
        </View>
        <Text className="text-center text-2xl font-bold tracking-tight">{t("account.pitchTitle")}</Text>
        <Text className="text-center text-[15px] leading-[22px] text-text-secondary">{t("account.pitchBody")}</Text>
      </View>

      {codeSentTo === null ? (
        <>
          <ActionButton
            leading={<GoogleLogo />}
            label={t("account.google")}
            busy={busy === "google"}
            disabled={busy !== null}
            onPress={() => void run("google", signInWithGoogle)}
            variant="primary"
          />

          <View className="flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />
            <Text className="text-[13px] text-text-tertiary">{t("account.or")}</Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          <View className="gap-3">
            <Field
              value={email}
              onChangeText={setEmail}
              placeholder={t("account.emailPlaceholder")}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              onSubmitEditing={() => emailValid && void sendCode()}
            />
            <ActionButton
              icon={Mail01Icon}
              label={t("account.sendCode")}
              busy={busy === "email"}
              disabled={!emailValid || busy !== null}
              onPress={() => void sendCode()}
            />
          </View>
        </>
      ) : (
        <View className="gap-3">
          <Text className="text-center text-[15px] text-text-secondary">
            {t("account.codeSent", { email: codeSentTo })}
          </Text>
          <Field
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
            placeholder={t("account.codePlaceholder")}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={10}
            autoFocus
            center
          />
          <ActionButton
            label={t("account.verify")}
            busy={busy === "code"}
            disabled={code.length < 6 || busy !== null}
            onPress={() => void run("code", () => verifyEmailCode(codeSentTo, code))}
            variant="primary"
          />
          <View className="flex-row justify-center gap-6 pt-1">
            <LinkButton
              label={t("account.changeEmail")}
              onPress={() => {
                setCodeSentTo(null);
                setError(null);
              }}
            />
            <LinkButton label={t("account.resend")} disabled={busy !== null} onPress={() => void sendCode()} />
          </View>
        </View>
      )}

      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-center text-[14px] text-red-500">
          {t(error)}
        </Text>
      ) : null}

      <Text className="text-center text-xs leading-[18px] text-text-tertiary">{t("account.privacyNote")}</Text>
    </View>
  );
}

function SignedIn() {
  const { t } = useT();
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const lastSyncedAt = useAuthStore((s) => s.lastSyncedAt);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const [busy, setBusy] = useState(false);

  const confirmDelete = () => {
    Alert.alert(translateNow("account.deleteConfirmTitle"), translateNow("account.deleteConfirmMessage"), [
      { text: translateNow("common.cancel"), style: "cancel" },
      {
        text: translateNow("account.deleteAction"),
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          const failure = await deleteAccount();
          setBusy(false);
          if (failure) Alert.alert(translateNow("account.errorGeneric"));
          else router.back();
        },
      },
    ]);
  };

  return (
    <View className="gap-6">
      <View className="items-center gap-3">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <HugeiconsIcon icon={CloudSavingDone01Icon} size={30} color={colors.primary} />
        </View>
        <Text className="text-[13px] uppercase tracking-widest text-text-secondary">{t("account.signedInAs")}</Text>
        <Text className="text-center text-xl font-bold" numberOfLines={1}>
          {user?.email ?? ""}
        </Text>
        <Text className="text-center text-[14px] text-text-secondary">
          {lastSyncedAt ? t("account.synced") : t("account.syncPending")}
        </Text>
      </View>

      <View className="gap-3">
        <ActionButton
          icon={Logout01Icon}
          label={t("account.signOut")}
          disabled={busy}
          onPress={() => {
            void signOut();
            router.back();
          }}
        />
        <Text className="text-center text-xs text-text-tertiary">{t("account.signOutNote")}</Text>
      </View>

      <View className="mt-6">
        <ActionButton
          icon={Delete02Icon}
          label={t("account.delete")}
          busy={busy}
          disabled={busy}
          onPress={confirmDelete}
          variant="danger"
        />
      </View>
    </View>
  );
}

interface FieldProps extends ComponentProps<typeof TextInput> {
  center?: boolean;
}

function Field({ center, ...props }: FieldProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      className="h-12 rounded-2xl border border-border bg-surface px-4 font-sans text-[16px] text-foreground"
      style={{
        paddingVertical: 0,
        includeFontPadding: false,
        textAlign: center ? "center" : "left",
        letterSpacing: center ? 4 : 0,
      }}
      placeholderTextColor={colors.textTertiary}
      selectionColor={colors.primary}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
    />
  );
}

/** Google's multicolour "G", as its sign-in branding guidelines ask for. */
function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconSvg;
  /** Drawn before the label in place of `icon`, e.g. a brand logo. */
  leading?: ReactNode;
  busy?: boolean;
  disabled?: boolean;
  variant?: "primary" | "surface" | "danger";
}

function ActionButton({ label, onPress, icon, leading, busy, disabled, variant = "surface" }: ActionButtonProps) {
  const { colors } = useTheme();
  const primary = variant === "primary";
  const tint = primary ? colors.onPrimary : variant === "danger" ? "#EF4444" : colors.textPrimary;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(busy) }}
      className={
        primary
          ? "h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary"
          : "h-12 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface"
      }
      style={{ opacity: disabled && !busy ? 0.5 : 1 }}
    >
      {busy ? (
        <ActivityIndicator color={tint} />
      ) : (
        <>
          {leading ?? (icon ? <HugeiconsIcon icon={icon} size={18} color={tint} /> : null)}
          <Text
            className={primary ? "text-[15px] font-semibold text-primary-foreground" : "text-[15px] font-semibold"}
            style={variant === "danger" ? { color: tint } : undefined}
          >
            {label}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

function LinkButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} hitSlop={8} accessibilityRole="button">
      <Text className="text-[14px] font-semibold text-primary">{label}</Text>
    </PressableScale>
  );
}
