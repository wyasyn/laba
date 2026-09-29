import { IconButton } from "@/components/ui/IconButton";
import { Search01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { useRouter } from "expo-router";

/** Search and profile buttons shown at the top right of every main tab. */
export function HeaderActions({ variant = "surface" }: { variant?: "surface" | "glass" }) {
  const router = useRouter();
  return (
    <>
      <IconButton
        icon={Search01Icon}
        onPress={() => router.push("/search")}
        accessibilityLabel="Search TV and radio"
        variant={variant}
        iconSize={18}
      />
      <IconButton
        icon={UserIcon}
        onPress={() => router.push("/settings")}
        accessibilityLabel="Open settings"
        variant={variant}
        iconSize={18}
      />
    </>
  );
}
