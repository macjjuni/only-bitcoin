import { useOutletContext } from "react-router";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { ConvertPannel } from "@/pages/btc2fiatPage/components";
import PremiumField from "@/pages/btc2fiatPage/components/premiumField/PremiumField";
import { PageLayout } from "@/layouts";

export default function Btc2FiatPage() {

  // region [Hooks]

  usePageAnimation(useOutletContext<UsePageAnimation>());

  // endregion


  return (
    <PageLayout className="btc-2-fiat-page__area">
      <ConvertPannel />
      <PremiumField />
    </PageLayout>
  );
}
