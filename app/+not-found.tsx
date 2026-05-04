import { Link, Stack } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 items-center justify-center bg-[#0b0b0f] p-6">
        <Text className="mb-2 text-center text-lg font-semibold text-white">
          Page not found
        </Text>
        <Text className="mb-6 text-center text-sm leading-5 text-[#b3b3b8]">
          This screen does not exist in the app.
        </Text>
        <Link href="/" asChild>
          <Pressable accessibilityRole="button">
            <Text className="text-sm font-semibold text-[#e50914]">Go to home</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}
