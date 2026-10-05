import { IconButton } from "@/components/ui/IconButton";
import { useT } from "@/lib/i18n";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "expo-router";

/** Search button shown at the top right of every main tab. */
export function HeaderActions({ variant = "surface" }: { variant?: "surface" | "glass" }) {
  const router = useRouter();
  const { t } = useT();
  return (
    <IconButton
      icon={Search01Icon}
      onPress={() => router.push("/search")}
      accessibilityLabel={t("search.open")}
      variant={variant}
      iconSize={18}
    />
  );
}
