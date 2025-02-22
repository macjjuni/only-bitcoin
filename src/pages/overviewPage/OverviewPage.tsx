import { ChartCard, MacroCard, BlockHalvingCard, PricePannel } from "@/widgets/pages/overview";
import "./OverviewPage.scss";


export default function OverviewPage() {

  return (
    <section className="overview-page__area">
      <PricePannel />
      <MacroCard />
      <BlockHalvingCard />
      <ChartCard />
    </section>
  );
}
