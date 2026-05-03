import { applyDefaultFont, FONT_LOAD_TIMEOUT_MS } from "@/constants/contants";
import { setupTrackPlayer } from "@/lib/trackPlayerSetup";
import { useTheme, useThemeVars } from "@/lib/useTheme";
import { VideoWarmup } from "@/lib/utils";
import { View } from "react-native";
import { useFavouritesStore } from "@/stores/useFavouritesStore";
import { useStationStore } from "@/stores/useStationStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useAuth } from "@clerk/expo";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import ErrorScreen from "./ErrorScreen";

function InitialLayout() {
  const { resolved } = useTheme();
  const themeVars = useThemeVars();
  const themeLoaded = useThemeStore((s) => s.isLoaded);
  const { isLoaded: authLoaded, isSignedIn } = useAuth({
    treatPendingAsSignedOut: false,
  });

  const [warmupDone, setWarmupDone] = useState(false);
  const [fontTimedOut, setFontTimedOut] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const fetchStations = useStationStore((s) => s.fetchStations);
  const hydrateFavourites = useFavouritesStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrate);

  useEffect(() => {
    async function init() {
      await Promise.all([fetchStations(), hydrateFavourites(), hydrateTheme(), setupTrackPlayer()]);
    }
    init();
  }, [fetchStations, hydrateFavourites, hydrateTheme]);

  useEffect(() => {
    if (fontsLoaded || fontError) return;
    const timer = setTimeout(() => setFontTimedOut(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (fontsLoaded) applyDefaultFont();
  }, [fontsLoaded]);

  const fontFailed = !!fontError || fontTimedOut;
  const fontReady = fontsLoaded || fontFailed;
  const ready = authLoaded && fontReady && themeLoaded;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  if (fontFailed) {
    return (
      <ErrorScreen
        message={
          "We couldn't load the app fonts. Please check your connection and restart the app."
        }
      />
    );
  }

  return (
    <View style={themeVars} className="flex-1">
      <StatusBar style={resolved === "light" ? "dark" : "light"} />
      {!warmupDone && <VideoWarmup onReady={() => setWarmupDone(true)} />}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
        </Stack.Protected>

        <Stack.Protected guard={!!isSignedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="station/[id]"
            options={{
              presentation: "card",
              headerShown: false,
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              presentation: "card",
              headerShown: false,
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="account"
            options={{
              presentation: "card",
              headerShown: false,
              animation: "slide_from_right",
            }}
          />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

export default InitialLayout;
