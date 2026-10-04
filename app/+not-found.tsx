import { EmptyState } from "@/components/EmptyState";
import { Stack, useRouter } from "expo-router";
import { View } from "react-native";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-background">
        <EmptyState
          title="Page not found"
          message="This screen does not exist in the app."
          actionLabel="Go to home"
          onAction={() => router.replace("/")}
        />
      </View>
    </>
  );
}
