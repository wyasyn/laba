import { IconButton } from "@/components/ui/IconButton";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "expo-router";

/** Search button shown at the top right of every main tab. */
export function HeaderActions({ variant = "surface" }: { variant?: "surface" | "glass" }) {
  const router = useRouter();
  return (
    <IconButton
      icon={Search01Icon}
      onPress={() => router.push("/search")}
      accessibilityLabel="Search TV and radio"
      variant={variant}
      iconSize={18}
    />
  );
}
