import { useTheme } from "@/lib/useTheme";
import {
  FavouriteIcon,
  Home01Icon,
  Radio01Icon,
  Tv01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, resolved } = useTheme();
  const tabBarHeight = 70;
  const horizontalMargin = width >= 430 ? 20 : width >= 380 ? 16 : 10;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 2,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={70}
            tint={resolved === "dark" ? "dark" : "light"}
            style={{ flex: 1, borderRadius: 55 }}
          />
        ),
        tabBarStyle: {
          position: "absolute",
          marginLeft: horizontalMargin,
          marginRight: horizontalMargin,
          bottom: insets.bottom + 10,
          backgroundColor: `${colors.surface}B3`,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: `${colors.border}CC`,
          borderRadius: 55,
          overflow: "hidden",
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
