import { BlockHalvingCard, ChartCard, MacroCard, PricePannel } from "@/widgets/pages/overview";
import { NotKeyNotYourBitcoin } from "@/widgets";
import "./OverviewPage.scss";


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
