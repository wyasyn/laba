import { useT } from "@/lib/i18n";
import { StationList } from "@/components/StationList";

export default function RadioScreen() {
  const { t } = useT();
  return <StationList type="radio" title={t("lists.radioTitle")} subtitle={t("lists.radioSubtitle")} />;
}
