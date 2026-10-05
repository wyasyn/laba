import InitialLayout from "@/components/layouts/InitialLayout";
import { initTelemetry, withTelemetry } from "@/lib/telemetry";
import * as SplashScreen from "expo-splash-screen";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import "../global.css";

LogBox.ignoreLogs(["new NativeEventEmitter"]);

SplashScreen.preventAutoHideAsync();
initTelemetry();

function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <GestureHandlerRootView className="flex-1">
        <InitialLayout />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default withTelemetry(RootLayout);
