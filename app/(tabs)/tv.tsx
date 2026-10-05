import { useT } from "@/lib/i18n";
import { StationList } from "@/components/StationList";

export default function TVScreen() {
  const { t } = useT();
  return <StationList type="tv" title={t("lists.tvTitle")} subtitle={t("lists.tvSubtitle")} />;
}
