import { useRef } from "react";
import { useOutletContext } from "react-router";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { BlockHalvingCard, ChartCard, MacroCard, PricePannel } from "@/pages/overviewPage/components";
import { PageLayout } from "@/layouts";
import { PipWindow } from "@/widgets";


export default function OverviewPage() {

  // region [Hooks]
  const pricePanelRef = useRef<HTMLDivElement | null>(null);
  usePageAnimation(useOutletContext<UsePageAnimation>());

  return (
    <PageLayout className="overview-page__area">
      <PricePannel ref={pricePanelRef} />
      <PipWindow ref={pricePanelRef} />
      <MacroCard />
      <BlockHalvingCard />
      <ChartCard />
    </PageLayout>
  );
}
