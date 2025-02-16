import "./OverviewPage.scss";
import { PricePannel, ChartCard, MacroCard, BlockCard } from "@/widgets";


export default function OverviewPage() {

  return (
    <section className="overview-page__wrapper">
      <PricePannel />
      <MacroCard />
      <BlockCard />
      <ChartCard />
    </section>
  );
}
