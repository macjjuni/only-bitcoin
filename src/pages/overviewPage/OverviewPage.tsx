import { BlockHalvingCard, ChartCard, MacroCard, PricePannel } from "@/widgets/pages/overview";
import "./OverviewPage.scss";
import { NotKeyNotYourBitcoin } from "@/widgets";


export default function OverviewPage() {

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
