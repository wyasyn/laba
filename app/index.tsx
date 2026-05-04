import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";

/**
 * Resolves `/` to sign-in or the main tabs so the root stack always has a leaf route.
 */
export default function RootIndex() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/sign-in" />;
}
