import { Outlet } from "react-router";
import MarketData from "@/pages/dashboard/components/marketData/marketData";
import "./main.scss";

const Main = () => {
  return (
    <main className="only-btc__main">
      <MarketData />
      <Outlet />
    </main>
  );
};

export default Main;
