import { useTheme } from "@/lib/useTheme";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountScreen() {
  const router = useRouter();
  const { colors } = useTheme();

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
            Auth has been removed from this app.
          </Text>
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center text-xl font-semibold text-foreground">
          Placeholder screen
        </Text>
        <Text className="mt-3 text-center text-base text-text-secondary">
          This route is kept intentionally while you rebuild account features from
          scratch.
        </Text>
      </View>
    </SafeAreaView>
  );
}
