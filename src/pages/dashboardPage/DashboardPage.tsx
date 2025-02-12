import "./DashboardPage.scss";
import BitcoinPriceCard from "@/widgets/dashboard/bitcoinPriceCard/BitcoinPriceCard";



export default function DashboardPage() {

  return (
    <section className="dashboard-page">
      <BitcoinPriceCard />
    </section>
  );
}
