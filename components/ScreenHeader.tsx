import { Text, View } from "react-native";
import { RefreshIndicator } from "./RefreshIndicator";

interface ScreenHeaderProps {
  title: string;
  subtitle: string;
}

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <View className="px-4 pb-3 pt-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-2xl font-bold text-foreground">{title}</Text>
          <Text className="mt-1 text-text-secondary">{subtitle}</Text>
        </View>
        <View className="pt-1">
          <RefreshIndicator />
        </View>
      </View>
    </View>
  );
}
