import "./OverviewPage.scss";
import { PricePannel, ChartCard, MacroCard, BlockCard } from "@/widgets";


export default function OverviewPage() {

  return (
    <section className="overview-page__area">
      <PricePannel />
      <MacroCard />
      <BlockCard />
      <ChartCard />
    </section>
  );
}
