import { useOutletContext } from "react-router";
import { usePageAnimation, type UsePageAnimation } from "@/shared/hooks";
import { ConvertPanel, PremiumBadge } from "@/pages/btc2fiatPage/components";
import { PageLayout } from "@/layouts";


export default function Btc2FiatPage() {

  // region [Hooks]
  usePageAnimation(useOutletContext<UsePageAnimation>());
  // endregion

  return (
    <PageLayout>
      <PremiumBadge />
      <ConvertPanel />
    </PageLayout>
  );
}
