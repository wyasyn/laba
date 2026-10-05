import { EmptyState } from "@/components/EmptyState";
import { useT } from "@/lib/i18n";
import { Stack, useRouter } from "expo-router";
import { View } from "react-native";

export default function NotFoundScreen() {
  const router = useRouter();
  const { t } = useT();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-background">
        <EmptyState
          title={t("notFound.title")}
          message={t("notFound.message")}
          actionLabel={t("notFound.action")}
          onAction={() => router.replace("/")}
        />
      </View>
    </>
  );
}
