import { useTheme } from "@/lib/useTheme";
import { useClerk, useUser } from "@clerk/expo";
import {
  ArrowLeft01Icon,
  Camera01Icon,
  Delete02Icon,
  Logout01Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SECTION_TITLE_CLASS =
  "mb-2 ml-1 text-xs font-semibold uppercase tracking-widest text-text-secondary";
const CARD_CLASS =
  "overflow-hidden rounded-2xl border border-border bg-surface";
const ROW_CLASS = "flex-row items-center gap-3 px-4 py-3.5";

export default function AccountScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
  }, [user?.id, user?.firstName, user?.lastName]);

  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? "";

  const hasProfileChanges = useMemo(() => {
    if (!user) return false;
    return (
      firstName !== (user.firstName ?? "") || lastName !== (user.lastName ?? "")
    );
  }, [user, firstName, lastName]);

  const onPickImage = useCallback(async () => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingImage(true);
    try {
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      await user.setProfileImage({ file: blob });
    } catch (e) {
      console.error("Profile image upload failed:", e);
      Alert.alert(
        "Could not update photo",
        "Please try again or pick a different image."
      );
    } finally {
      setUploadingImage(false);
    }
  }, [user]);

  const onSave = useCallback(async () => {
    if (!user || !hasProfileChanges) return;
    setSavingProfile(true);
    try {
      await user.update({ firstName, lastName });
    } catch (e) {
      console.error("Profile update failed:", e);
      Alert.alert("Could not save", "Please check your details and try again.");
    } finally {
      setSavingProfile(false);
    }
  }, [user, firstName, lastName, hasProfileChanges]);

  const onSignOut = useCallback(() => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }, [signOut]);

  const onDelete = useCallback(() => {
    if (!user?.deleteSelfEnabled) return;
    Alert.alert(
      "Delete account",
      "This permanently deletes your account and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void user.delete().catch((e) => {
              console.error("Delete account failed:", e);
              Alert.alert(
                "Could not delete",
                "Please try again or contact support."
              );
            });
          },
        },
      ]
    );
  }, [user]);

  const inputClass =
    "rounded-xl border border-border bg-surface-light px-4 py-3.5 text-[16px] text-foreground";

  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-foreground">
            You need to be signed in to view this screen.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 rounded-xl bg-primary px-6 py-3"
          >
            <Text className="font-semibold text-white">Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text className="text-[26px] font-bold text-foreground">Account</Text>
          <Text className="mt-0.5 text-sm text-text-secondary">
            Profile and session
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center pt-2">
          <Pressable
            onPress={() => void onPickImage()}
            disabled={uploadingImage}
            className="relative"
          >
            <View className="h-24 w-24 overflow-hidden rounded-full border-2 border-border bg-surface-light">
              <Image
                source={{ uri: user.imageUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
              />
              {uploadingImage ? (
                <View className="absolute inset-0 items-center justify-center bg-background/70">
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null}
            </View>
            <View className="absolute bottom-0 right-0 rounded-full border-2 border-background bg-primary p-1.5">
              <HugeiconsIcon
                icon={Camera01Icon}
                size={16}
                color="#FFFFFF"
              />
            </View>
          </Pressable>
          <Text className="mt-3 text-sm text-text-secondary">
            Tap photo to change
          </Text>
        </View>

        <View>
          <Text className={SECTION_TITLE_CLASS}>Profile</Text>
          <View className={CARD_CLASS}>
            <View className="gap-3 p-4">
              <View>
                <Text className="mb-1.5 text-sm font-medium text-foreground">
                  First name
                </Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                  className={inputClass}
                />
              </View>
              <View>
                <Text className="mb-1.5 text-sm font-medium text-foreground">
                  Last name
                </Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                  className={inputClass}
                />
              </View>
              <Pressable
                onPress={() => void onSave()}
                disabled={!hasProfileChanges || savingProfile}
                className={`mt-1 flex-row items-center justify-center rounded-xl py-3.5 ${
                  !hasProfileChanges || savingProfile
                    ? "bg-primary/40"
                    : "bg-primary"
                }`}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-[16px] font-semibold text-white">
                    Save changes
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        <View>
          <Text className={SECTION_TITLE_CLASS}>Email</Text>
          <View className={CARD_CLASS}>
            <View className={ROW_CLASS}>
              <HugeiconsIcon
                icon={Mail01Icon}
                size={22}
                color={colors.textSecondary}
              />
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-foreground">
                  {primaryEmail || "No email on file"}
                </Text>
                <Text className="mt-0.5 text-xs text-text-secondary">
                  Sign-in email (managed in Clerk)
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View>
          <Text className={SECTION_TITLE_CLASS}>Session</Text>
          <View className={CARD_CLASS}>
            <Pressable className={ROW_CLASS} onPress={onSignOut}>
              <HugeiconsIcon
                icon={Logout01Icon}
                size={22}
                color={colors.error}
              />
              <Text className="flex-1 text-[15px] font-medium text-error">
                Sign out
              </Text>
            </Pressable>
          </View>
        </View>

        {user.deleteSelfEnabled ? (
          <View>
            <Text className={SECTION_TITLE_CLASS}>Danger zone</Text>
            <View className={CARD_CLASS}>
              <Pressable className={ROW_CLASS} onPress={onDelete}>
                <HugeiconsIcon
                  icon={Delete02Icon}
                  size={22}
                  color={colors.error}
                />
                <Text className="flex-1 text-[15px] font-medium text-error">
                  Delete account
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
