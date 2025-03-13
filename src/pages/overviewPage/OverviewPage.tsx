import { useOutletContext } from "react-router";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { BlockHalvingCard, ChartCard, MacroCard, PricePannel } from "@/widgets/pages/overview";
import { NotKeyNotYourBitcoin } from "@/widgets";
import "./OverviewPage.scss";


export default function OverviewPage() {

  // region [Hooks]

  usePageAnimation(useOutletContext<UsePageAnimation>());

  // endregion


  return (
    <section className="overview-page__area">
      <PricePannel />
      <MacroCard />
      <BlockHalvingCard />
      <ChartCard />
      <NotKeyNotYourBitcoin />
    </section>
  );
}
