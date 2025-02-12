import PageLayout from "@/layouts/pageLayout/pageLayout";
import MarketChart from "@/pages/dashboard/components/marketChart/marketChart";
import "./dashboard.scss";

export default function Dashboard() {
  return (
    <PageLayout className="dashboard-page">
      <MarketChart />
    </PageLayout>
  );
}
