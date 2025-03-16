import { useOutletContext } from "react-router";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { PremiumPannel } from "@/widgets/pages/premium";
import { PageLayout } from "@/layouts";


export default function PremiumPage() {

  // region [Hooks]

  usePageAnimation(useOutletContext<UsePageAnimation>());

  // endregion


  return (
    <PageLayout className="premium-page__area">
      <PremiumPannel />
    </PageLayout>
  );
}
