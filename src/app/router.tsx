import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import Client from "@/app/Client";
import withSuspense from "@/widgets/hoc/withSuspence";
import {DashboardIcon, ExchangeIcon, BlockIcon, PremiumIcon, GearIcon} from "@/shared/icon";


const OverviewPage = withSuspense(lazy(() => import("@/pages/overviewPage/OverviewPage")));
const BlockPage = withSuspense(lazy(() => import("@/pages/blockPage/BlockPage")));
const Btc2KrwPage = withSuspense(lazy(() => import("@/pages/btc2krwPage/Btc2krwPage")));
const PremiumPage = withSuspense(lazy(() => import("@/pages/premiumPage/PremiumPage")));
const SettingsPage = withSuspense(lazy(() => import("@/pages/settingsPage/SettingsPage")));


const clientRoutes = [
  { title: "Overview", path: "/", element: <OverviewPage />, isNav: true, icon: <DashboardIcon size={30} /> },
  { title: "Block", path: "/btc2krw", element: <BlockPage />, isNav: true, icon: <BlockIcon size={32} /> },
  { title: "BTC to KRW", path: "/block", element: <Btc2KrwPage />, isNav: true, icon: <ExchangeIcon size={40} />, style: { padding: '3px' } },
  { title: "Premium", path: "/premium", element: <PremiumPage />, isNav: true, icon: <PremiumIcon size={28} /> },
  { title: "Settings", path: "/settings", element: <SettingsPage />, isNav: true, icon: <GearIcon size={30} /> },
  { title: "404 - Not Found", path: "/*", element: <>error</>, isNav: false, icon: null, }
];


const browserRouter = createBrowserRouter([
  {
    path: "/",
    Component: Client,
    children: clientRoutes.map(({ title, isNav, icon, style, ...rest }) => rest)
  }
]);

const navigationItems = clientRoutes.filter(({title, element, isNav, ...restProps}) => isNav && restProps);

export default {clientRoutes, browserRouter, navigationItems};
