import "./OverviewPage.scss";
import ChartCard from "@/widgets/overview/chartCard/ChartCard";
import SmallCard from "@/widgets/overview/card/SmallCard";
// import BitcoinPriceCard from "@/widgets/dashboard/bitcoinPriceCard/BitcoinPriceCard";


export default function OverviewPage() {


  return (
    <section className="overview-page__wrapper">
      <ChartCard />
      <SmallCard> </SmallCard>
      <SmallCard> </SmallCard>
    </section>
  );
}
