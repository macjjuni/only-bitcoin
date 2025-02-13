import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import Client from "@/app/Client";
import withSuspense from "@/widgets/hoc/withSuspence";
import {DashboardIcon, ExchangeIcon, BlockIcon, PremiumIcon, GearIcon} from "@/shared/icon";


const OverviewPage = withSuspense(lazy(() => import("@/pages/overviewPage/OverviewPage")));
const BlockStatusPage = withSuspense(lazy(() => import("@/pages/blockStatusPage/BlockStatusPage")));
const Btc2KrwPage = withSuspense(lazy(() => import("@/pages/btc2krwPage/Btc2krwPage")));
const PremiumPage = withSuspense(lazy(() => import("@/pages/premiumPage/PremiumPage")));
const SettingsPage = withSuspense(lazy(() => import("@/pages/settingsPage/SettingsPage")));


const clientRoutes = [
  { title: "Overview", path: "/", element: <OverviewPage />, isNav: true, icon: <DashboardIcon size={28} /> },
  { title: "BTC to KRW", path: "/btc2krw", element: <Btc2KrwPage />, isNav: true, icon: <BlockIcon size={28} /> },
  { title: "블록현황", path: "/block-status", element: <BlockStatusPage />, isNav: true, icon: <ExchangeIcon size={34} />, style: { padding: '5px' } },
  { title: "프리미엄", path: "/premium", element: <PremiumPage />, isNav: true, icon: <PremiumIcon /> },
  { title: "설정", path: "/settings", element: <SettingsPage />, isNav: true, icon: <GearIcon /> },
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
