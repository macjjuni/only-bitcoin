import PageLayout from "@/layout/pageLayout/pageLayout";
import MarketData from "@/pages/dashboard/components/marketData/marketData";
import MarketChart from "@/pages/dashboard/components/marketChart/marketChart";
import "./dashboard.scss";

export default function Dashboard() {
  return (
    <PageLayout className="dashboard-page">
      <MarketData />
      <MarketChart />
    </PageLayout>
  );
}
