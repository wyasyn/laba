import { AudioEngine } from "@/components/audio/AudioEngine";
import { OfflineBanner } from "@/components/OfflineBanner";
import { setupTrackPlayer } from "@/lib/trackPlayerSetup";
import { useTheme, useThemeVars } from "@/lib/useTheme";
import { VideoWarmup } from "@/lib/utils";
import { useFavouritesStore } from "@/stores/useFavouritesStore";
import { useLocaleStore } from "@/stores/useLocaleStore";
import { watchNetwork } from "@/stores/useNetworkStore";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { useRecentsStore } from "@/stores/useRecentsStore";
import { useStationStore } from "@/stores/useStationStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";

function InitialLayout() {
  const { resolved, colors } = useTheme();
  const themeVars = useThemeVars();
  const themeLoaded = useThemeStore((s) => s.isLoaded);
  const onboardingLoaded = useOnboardingStore((s) => s.isLoaded);

  const [warmupDone, setWarmupDone] = useState(false);

  const fetchStations = useStationStore((s) => s.fetchStations);
  const hydrateFavourites = useFavouritesStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateOnboarding = useOnboardingStore((s) => s.hydrate);
  const hydrateRecents = useRecentsStore((s) => s.hydrate);
  const hydrateLocale = useLocaleStore((s) => s.hydrate);

  useEffect(() => {
    void Promise.all([
      fetchStations(),
      hydrateFavourites(),
      hydrateTheme(),
      hydrateOnboarding(),
      hydrateRecents(),
      hydrateLocale(),
      setupTrackPlayer(),
    ]);
  }, [fetchStations, hydrateFavourites, hydrateTheme, hydrateOnboarding, hydrateRecents, hydrateLocale]);

  useEffect(() => watchNetwork(), []);

  // Fonts are embedded natively (expo-font config plugin), so the only things
  // worth holding the splash for are the theme and the first route decision.
  const ready = themeLoaded && onboardingLoaded;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const contentStyle = { backgroundColor: colors.background };

  return (
    <View style={themeVars} className="flex-1 bg-background">
      <StatusBar style={resolved === "light" ? "dark" : "light"} />
      {!warmupDone && <VideoWarmup onReady={() => setWarmupDone(true)} />}
      <AudioEngine />
      <Stack screenOptions={{ headerShown: false, contentStyle }}>
        <Stack.Screen name="index" options={{ animation: "fade" }} />
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen
          name="station/[id]"
          options={{
            presentation: "card",
            animation: Platform.OS === "ios" ? "slide_from_bottom" : "fade_from_bottom",
            gestureEnabled: true,
            gestureDirection: "vertical",
          }}
        />
        <Stack.Screen name="search" options={{ animation: "fade" }} />
        <Stack.Screen name="favourites" options={{ animation: "slide_from_right" }} />
      </Stack>
      <OfflineBanner />
    </View>
  );
}

export default InitialLayout;
