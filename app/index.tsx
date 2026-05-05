import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ONBOARDING_COMPLETED_KEY = "onboarding_completed_v1";

/**
 * Shows onboarding once, then routes all future launches to tabs.
 */
export default function RootIndex() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    let active = true;
    const checkOnboarding = async () => {
      try {
        const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
        if (!active) return;
        if (completed === "true") {
          router.replace("/(tabs)");
          return;
        }
        setShowOnboarding(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    void checkOnboarding();
    return () => {
      active = false;
    };
  }, [router]);

  const onGetStarted = async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
    router.replace("/(tabs)");
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!showOnboarding) return null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1 px-6 py-10">
        <View className="flex-1 items-center justify-center">
          <Text className="text-3xl font-bold text-foreground">Welcome to Laba</Text>
          <Text className="mt-4 text-center text-base text-text-secondary max-w-sm ">
            Stream live TV and radio in one place. Start exploring stations now.
          </Text>
        </View>
        <Pressable
          onPress={() => void onGetStarted()}
          className="mb-6 items-center rounded-xl bg-primary py-4"
        >
          <Text className="text-base font-semibold text-white">Get Started</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
