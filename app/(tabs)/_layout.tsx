import { useTheme } from "@/lib/useTheme";
import {
  FavouriteIcon,
  Home01Icon,
  Radio01Icon,
  Tv01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const tabBarHeight = 62;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: insets.bottom + 10,
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 22,
          height: tabBarHeight,
          paddingBottom: 8,
          paddingTop: 8,
          paddingHorizontal: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          borderRadius: 14,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <HugeiconsIcon icon={Home01Icon} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tv"
        options={{
          title: "TV",
          tabBarIcon: ({ color, size }) => (
            <HugeiconsIcon icon={Tv01Icon} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="radio"
        options={{
          title: "Radio",
          tabBarIcon: ({ color, size }) => (
            <HugeiconsIcon icon={Radio01Icon} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favourites"
        options={{
          title: "Favourites",
          tabBarIcon: ({ color, size }) => (
            <HugeiconsIcon icon={FavouriteIcon} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
