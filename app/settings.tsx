import { useTheme } from "@/lib/useTheme";
import { useFavouritesStore } from "@/stores/useFavouritesStore";
import { useThemeStore, type ThemeMode } from "@/stores/useThemeStore";
import { useUser } from "@clerk/expo";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  FavouriteIcon,
  InformationCircleIcon,
  Mail01Icon,
  Moon02Icon,
  Settings01Icon,
  SmartPhone01Icon,
  StarIcon,
  Sun03Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
const APP_NAME = Constants.expoConfig?.name ?? "Laba";
const RUNTIME_VERSION =
  (Constants.expoConfig?.runtimeVersion as string | undefined) ??
  Constants.expoConfig?.sdkVersion ??
  "—";

type ThemeOption = {
  mode: ThemeMode;
  label: string;
  icon: typeof Sun03Icon;
};

const THEME_OPTIONS: ThemeOption[] = [
  { mode: "light", label: "Light", icon: Sun03Icon },
  { mode: "dark", label: "Dark", icon: Moon02Icon },
  { mode: "system", label: "System", icon: SmartPhone01Icon },
];

const SECTION_TITLE_CLASS =
  "mb-2 ml-1 text-xs font-semibold uppercase tracking-widest text-text-secondary";
const CARD_CLASS =
  "overflow-hidden rounded-2xl border border-border bg-surface";
const ROW_CLASS = "flex-row items-center gap-3 px-4 py-3.5";
const DIVIDER_CLASS = "ml-[52px] h-px bg-border";

export default function SettingsScreen() {
  const { colors, mode } = useTheme();
  const setMode = useThemeStore((s) => s.setMode);
  const favouriteCount = useFavouritesStore((s) => s.ids.length);
  const router = useRouter();
  const { user } = useUser();

  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const displayName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    primaryEmail ||
    "Signed in";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center gap-3 px-4 pb-2 pt-4">
        <Pressable
          onPress={() => router.back()}
          className="rounded-full bg-surface p-2.5"
          hitSlop={8}
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            size={22}
            color={colors.textPrimary}
          />
        </Pressable>
        <View className="flex-1">
          <Text className="text-[26px] font-bold text-foreground">
            Settings
          </Text>
          <Text className="mt-0.5 text-sm text-text-secondary">
            Customise your experience
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <View>
          <Text className={SECTION_TITLE_CLASS}>Appearance</Text>
          <View className={CARD_CLASS}>
            <View className="gap-3 p-4">
              <Text className="text-[15px] font-semibold text-foreground">
                Theme
              </Text>
              <View className="flex-row gap-2">
                {THEME_OPTIONS.map((opt) => {
                  const active = mode === opt.mode;
                  return (
                    <Pressable
                      key={opt.mode}
                      onPress={() => setMode(opt.mode)}
                      className={`flex-1 items-center justify-center gap-1.5 rounded-xl border py-3 ${
                        active
                          ? "border-primary bg-primary"
                          : "border-border bg-surface-light"
                      }`}
                    >
                      <HugeiconsIcon
                        icon={opt.icon}
                        size={20}
                        color={active ? "#FFFFFF" : colors.textPrimary}
                      />
                      <Text
                        className={`text-[13px] font-semibold ${active ? "text-white" : "text-foreground"}`}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Library */}
        <View>
          <Text className={SECTION_TITLE_CLASS}>Library</Text>
          <View className={CARD_CLASS}>
            <Pressable
              className={ROW_CLASS}
              onPress={() => router.push("/(tabs)/favourites")}
            >
              <HugeiconsIcon
                icon={FavouriteIcon}
                size={22}
                color={colors.primary}
              />
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-foreground">
                  Favourites
                </Text>
                <Text className="mt-0.5 text-xs text-text-secondary">
                  {favouriteCount} saved station
                  {favouriteCount !== 1 ? "s" : ""}
                </Text>
              </View>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>

        {/* Account */}
        <View>
          <Text className={SECTION_TITLE_CLASS}>Account</Text>
          <View className={CARD_CLASS}>
            <View className={ROW_CLASS}>
              <View
                className="h-11 w-11 overflow-hidden rounded-full bg-surface-light"
                style={{ borderRadius: 22 }}
              >
                {user?.imageUrl ? (
                  <Image
                    source={{ uri: user.imageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <HugeiconsIcon
                      icon={UserIcon}
                      size={22}
                      color={colors.textSecondary}
                    />
                  </View>
                )}
              </View>
              <View className="flex-1">
                <Text
                  numberOfLines={1}
                  className="text-[15px] font-semibold text-foreground"
                >
                  {displayName}
                </Text>
                {!!primaryEmail && (
                  <Text
                    numberOfLines={1}
                    className="mt-0.5 text-xs text-text-secondary"
                  >
                    {primaryEmail}
                  </Text>
                )}
              </View>
            </View>
            <View className={DIVIDER_CLASS} />
            <Pressable
              className={ROW_CLASS}
              onPress={() => router.push("/account")}
            >
              <HugeiconsIcon
                icon={UserIcon}
                size={22}
                color={colors.textSecondary}
              />
              <Text className="flex-1 text-[15px] text-foreground">
                Manage account
              </Text>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>

        {/* Support */}
        <View>
          <Text className={SECTION_TITLE_CLASS}>Support</Text>
          <View className={CARD_CLASS}>
            <Pressable
              className={ROW_CLASS}
              onPress={() =>
                Linking.openURL("mailto:ywalum@gmail.com").catch(() => {})
              }
            >
              <HugeiconsIcon
                icon={Mail01Icon}
                size={22}
                color={colors.textSecondary}
              />
              <Text className="flex-1 text-[15px] text-foreground">
                Contact support
              </Text>
            </Pressable>
            <View className={DIVIDER_CLASS} />
            <Pressable className={ROW_CLASS}>
              <HugeiconsIcon
                icon={StarIcon}
                size={22}
                color={colors.textSecondary}
              />
              <Text className="flex-1 text-[15px] text-foreground">
                Rate the app
              </Text>
            </Pressable>
          </View>
        </View>

        {/* About */}
        <View>
          <Text className={SECTION_TITLE_CLASS}>About</Text>
          <View className={CARD_CLASS}>
            <View className={ROW_CLASS}>
              <HugeiconsIcon
                icon={InformationCircleIcon}
                size={22}
                color={colors.textSecondary}
              />
              <Text className="flex-1 text-[15px] text-foreground">
                App name
              </Text>
              <Text className="text-sm text-text-secondary">{APP_NAME}</Text>
            </View>
            <View className={DIVIDER_CLASS} />
            <View className={ROW_CLASS}>
              <HugeiconsIcon
                icon={Settings01Icon}
                size={22}
                color={colors.textSecondary}
              />
              <Text className="flex-1 text-[15px] text-foreground">
                Version
              </Text>
              <Text className="text-sm text-text-secondary">{APP_VERSION}</Text>
            </View>
            <View className={DIVIDER_CLASS} />
            <View className={ROW_CLASS}>
              <HugeiconsIcon
                icon={SmartPhone01Icon}
                size={22}
                color={colors.textSecondary}
              />
              <Text className="flex-1 text-[15px] text-foreground">
                Runtime
              </Text>
              <Text className="text-sm text-text-secondary">
                {RUNTIME_VERSION}
              </Text>
            </View>
          </View>

          <Text className="mt-4 text-center text-xs leading-[18px] text-text-secondary">
            Laba streams free-to-air TV and radio — Uganda focus, plus
            international channels.{"\n"}
            Made with care in Uganda.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
