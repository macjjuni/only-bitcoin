import { useOutletContext } from "react-router";
import { usePageAnimation, type UsePageAnimation } from "@/shared/hooks";
import { ConvertPanel } from "@/pages/btc2fiatPage/components";
import PremiumField from "@/pages/btc2fiatPage/components/premiumField/PremiumField";
import PremiumBadge from "@/pages/btc2fiatPage/components/premiumBadge/PremiumBadge";
import { PageLayout } from "@/layouts";
import "./Btc2FiatPage.scss";


export default function Btc2FiatPage() {

  // region [Hooks]
  usePageAnimation(useOutletContext<UsePageAnimation>());
  // endregion

  return (
    <PageLayout>
      <PremiumBadge />
      <ConvertPanel />
      <PremiumField />
    </PageLayout>
  );
}
