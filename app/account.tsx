import { EmptyState } from "@/components/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Text } from "@/components/ui/Text";
import { ArrowLeft01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 4 }} className="flex-row items-center gap-3 px-4 pb-2">
        <IconButton icon={ArrowLeft01Icon} onPress={() => router.back()} accessibilityLabel="Go back" />
        <Text className="text-[17px] font-semibold">Account</Text>
      </View>
      <EmptyState
        icon={UserIcon}
        title="Accounts are coming"
        message="Sign in to sync favourites across devices. For now, everything is saved on this phone."
      />
    </View>
  );
}
