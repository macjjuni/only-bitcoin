import { useOutletContext } from "react-router";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { BlockHalvingCard, ChartCard, MacroCard, PricePannel } from "@/pages/overviewPage/components";
import { PageLayout } from "@/layouts";


export default function OverviewPage() {

  // region [Hooks]
  usePageAnimation(useOutletContext<UsePageAnimation>());
  // endregion

  return (
    <PageLayout className="overview-page__area">
      <PricePannel />
      <MacroCard />
      <BlockHalvingCard />
      <ChartCard />
    </PageLayout>
  );
}
