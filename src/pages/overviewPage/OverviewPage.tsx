import { ChartCard, MacroCard, BlockCard, PricePannel } from "@/widgets/pages/overview";
import "./OverviewPage.scss";


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
