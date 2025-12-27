import { useOutletContext } from "react-router";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { PremiumPanel } from "@/pages/premiumPage/components";
import { PageLayout } from "@/layouts";


export default function PremiumPage() {

  // region [Hooks]
  usePageAnimation(useOutletContext<UsePageAnimation>());
  // endregion

  return (
    <PageLayout className="premium-page__area">
      <PremiumPanel />
    </PageLayout>
  );
}
