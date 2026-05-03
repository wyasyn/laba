import { ScreenHeader } from "@/components/ScreenHeader";
import { StationList } from "@/components/StationList";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RadioScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StationList
        type="radio"
        header={
          <ScreenHeader
            title="Radio Stations"
            subtitle="Live free-to-air radio streams"
          />
        }
      />
    </SafeAreaView>
  );
}
